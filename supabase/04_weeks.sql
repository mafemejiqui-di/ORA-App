-- ════════════════════════════════════════════════════════════════════════
-- ORA · Tensiones semana por semana (vista Ciclo de la administradora)
-- Ejecutar DESPUÉS de 01, 02 y 03: SQL Editor → New query → pegar todo → Run.
-- Se puede volver a ejecutar sin problema.
--
-- Devuelve, para cada semana de cada ciclo de un equipo (desde la semana 1 del ciclo 1
-- hasta la semana en curso), los temas que más tensión generaron en ESA semana:
--   · frenos de "Tomar una decisión"
--   · patrones de actitud de "Ver cómo estamos"
--   · "Tensión" y "Desconexión" en "qué siento en el equipo"
-- Igual que el resto de la app: solo agregados y ningún tema con menos de 3 personas.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.get_team_weeks(p_team uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  min_n constant int := 3;
  result jsonb;
begin
  if p_team is null or (p_team is distinct from public.my_team_id() and not public.is_admin()) then
    raise exception 'forbidden';
  end if;

  perform public.ensure_cycles(p_team);

  with weeks as (
    select c.number, w as week,
           c.starts_at + (w - 1) * interval '7 days' as ws,
           c.starts_at + w * interval '7 days' as we
      from public.cycles c cross join generate_series(1, 3) as w
     where c.team_id = p_team and c.starts_at + (w - 1) * interval '7 days' <= now()
  ), records as (
    select user_id, saved_at, unnest(frenos) as label from public.decisions where team_id = p_team
    union all
    select user_id, saved_at, public.actitud_pattern(actitud) from public.diagnoses
     where team_id = p_team and public.actitud_pattern(actitud) is not null
    union all
    select user_id, saved_at, sentir from public.diagnoses
     where team_id = p_team and sentir in ('Tensión', 'Desconexión')
  ), themes as (
    select wk.number, wk.week, r.label, r.user_id
      from weeks wk join records r on r.saved_at >= wk.ws and r.saved_at < wk.we
  ), activity as (
    -- Personas que registraron algo en la semana (cualquier módulo).
    select wk.number, wk.week, count(distinct a.user_id) as n
      from weeks wk
      join (
        select user_id, saved_at from public.diagnoses where team_id = p_team
        union all select user_id, saved_at from public.decisions where team_id = p_team
        union all select user_id, saved_at from public.closings  where team_id = p_team
      ) a on a.saved_at >= wk.ws and a.saved_at < wk.we
     group by wk.number, wk.week
  ), eligible as (
    select number, week from themes group by number, week having count(distinct user_id) >= min_n
  ), counted as (
    select t.number, t.week, t.label, count(*) as n,
           row_number() over (partition by t.number, t.week order by count(*) desc, t.label) as rk,
           max(count(*)) over (partition by t.number, t.week) as top_n
      from themes t join eligible e on e.number = t.number and e.week = t.week
     group by t.number, t.week, t.label
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'cycleNumber', wk.number,
           'week', wk.week,
           'startsAt', wk.ws,
           'endsAt', wk.we,
           'current', now() < wk.we,
           'respondents', coalesce(a.n, 0),
           'tension', coalesce((
             select jsonb_agg(jsonb_build_object('label', k.label, 'value', round(k.n::numeric / k.top_n, 3)) order by k.rk)
               from counted k where k.number = wk.number and k.week = wk.week and k.rk <= 3
           ), '[]'::jsonb)
         ) order by wk.number, wk.week), '[]'::jsonb)
    into result
    from weeks wk
    left join activity a on a.number = wk.number and a.week = wk.week;

  return result;
end;
$$;

revoke execute on function public.get_team_weeks(uuid) from public, anon;
grant execute on function public.get_team_weeks(uuid) to authenticated;
