-- ════════════════════════════════════════════════════════════════════════
-- ORA · Porcentaje de las tensiones más evidenciadas (informe PDF de la administradora)
-- Ejecutar DESPUÉS de 01–04: SQL Editor → New query → pegar todo → Run.
-- Se puede volver a ejecutar sin problema.
--
-- Para cada equipo (y para todos juntos) cuenta las menciones de cada tema de tensión en los
-- últimos `p_days` días y calcula qué porcentaje del total representa cada uno:
--   · frenos de "Tomar una decisión"
--   · patrones de actitud de "Ver cómo estamos"
--   · "Tensión" y "Desconexión" en "qué siento en el equipo"
-- Igual que el resto de la app: solo agregados y ningún equipo con menos de 3 personas.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.get_admin_tension_shares(p_days int default 14) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  min_n constant int := 3;
  since timestamptz := now() - make_interval(days => p_days);
  per_team jsonb;
  overall jsonb;
  all_total int;
  all_people int;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;

  create temporary table if not exists pg_temp.admin_themes (team_id uuid, label text, user_id uuid) on commit drop;
  truncate pg_temp.admin_themes;
  insert into pg_temp.admin_themes
    select x.team_id, unnest(x.frenos), x.user_id from public.decisions x where x.saved_at >= since
    union all
    select x.team_id, public.actitud_pattern(x.actitud), x.user_id from public.diagnoses x
     where x.saved_at >= since and public.actitud_pattern(x.actitud) is not null
    union all
    select x.team_id, x.sentir, x.user_id from public.diagnoses x
     where x.saved_at >= since and x.sentir in ('Tensión', 'Desconexión');

  -- Por equipo (solo equipos con 3+ personas que registraron tensiones).
  with eligible as (
    select team_id, count(*) as total, count(distinct user_id) as people
      from pg_temp.admin_themes group by team_id having count(distinct user_id) >= min_n
  ), counted as (
    select t.team_id, t.label, count(*) as n,
           row_number() over (partition by t.team_id order by count(*) desc, t.label) as rk
      from pg_temp.admin_themes t join eligible e on e.team_id = t.team_id
     group by t.team_id, t.label
  )
  select coalesce(jsonb_object_agg(e.team_id, jsonb_build_object(
           'total', e.total,
           'people', e.people,
           'themes', (select jsonb_agg(jsonb_build_object('label', c.label, 'count', c.n,
                              'share', round(100.0 * c.n / e.total, 1)) order by c.rk)
                        from counted c where c.team_id = e.team_id and c.rk <= 5)
         )), '{}'::jsonb)
    into per_team
    from eligible e;

  -- Todos los equipos juntos (el porcentaje es sobre el total de menciones).
  select count(*), count(distinct user_id) into all_total, all_people from pg_temp.admin_themes;
  if all_people >= min_n then
    select jsonb_build_object(
             'total', all_total,
             'people', all_people,
             'themes', jsonb_agg(jsonb_build_object('label', label, 'count', n,
                                 'share', round(100.0 * n / all_total, 1)) order by n desc, label)
           )
      into overall
      from (select label, count(*) as n from pg_temp.admin_themes group by label
             order by count(*) desc, label limit 5) top;
  end if;

  return jsonb_build_object('days', p_days, 'teams', per_team, 'overall', overall);
end;
$$;

revoke execute on function public.get_admin_tension_shares(int) from public, anon;
grant execute on function public.get_admin_tension_shares(int) to authenticated;
