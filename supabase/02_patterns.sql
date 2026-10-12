-- ════════════════════════════════════════════════════════════════════════
-- ORA · Fases 4 y 5 · Patrones, avance del ciclo, historial y tiempo real
-- Ejecutar DESPUÉS de 01_schema.sql: SQL Editor → New query → pegar todo → Run.
-- Se puede volver a ejecutar sin problema (reemplaza las funciones).
--
-- Fórmula aprobada por el usuario:
--   Fricción (Ver cómo estamos) = 0.6 · señal de "qué siento" + 0.4 · (actitud con patrón)
--       qué siento: Desconexión 1 · Tensión 1 · Rutina 0.3 · Colaboración 0 · Motivación 0
--   Tensión de una decisión: frenos relacionales (Tensión generacional, Falta de consenso) 1 ·
--       de presión (Miedo al error, Presión de tiempo) 0.5 · solo Falta de información 0.2 ·
--       +0.2 si la urgencia es "Hoy" (máximo 1)
--   Tensión de cierre: Peor 1 · Igual 0.5 · Algo mejor 0.25 · Mejor / Mucho mejor 0
--   Energía: Agotado 1 · Neutro 2 · Estable 3 · Activo 4 · Enfocado 5
--   Niveles del mapa: < 0.25 baja · 0.25–0.5 media · > 0.5 alta
--   Privacidad: ningún grupo (generación, equipo, tema) se muestra con menos de 3 personas,
--   salvo "Fricción más frecuente" por generación, que se muestra desde 2 (decisión del usuario).
--
-- Tiempo real: cada registro nuevo toca `teams.activity_at`; la app escucha ese cambio
-- (Supabase Realtime) y vuelve a pedir los datos agregados. Nunca viajan respuestas individuales.
-- ════════════════════════════════════════════════════════════════════════


-- ── 1. PUNTAJES (la fórmula, en un solo lugar) ───────────────────────────


create or replace function public.actitud_pattern(p_actitud text) returns text
language sql immutable set search_path = '' as $$
  select case p_actitud
    when 'Así siempre lo hemos hecho' then 'Resistencia al cambio'
    when 'Prefiere resolver solo antes de pedir ayuda' then 'Aislamiento'
    when '¿Y esto para qué nos sirve?' then 'Falta de propósito'
    when 'Le cuesta aceptar decisiones sin explicación' then 'Necesidad de claridad'
    else null
  end;
$$;

create or replace function public.score_friction(p_sentir text, p_actitud text) returns numeric
language sql immutable set search_path = '' as $$
  select 0.6 * case p_sentir when 'Desconexión' then 1 when 'Tensión' then 1 when 'Rutina' then 0.3 else 0 end
       + 0.4 * case when public.actitud_pattern(p_actitud) is not null then 1 else 0 end;
$$;
create or replace function public.score_decision(p_frenos text[], p_urgencia text) returns numeric
language sql immutable set search_path = '' as $$
  select least(1,
    case
      when p_frenos && array['Tensión generacional', 'Falta de consenso'] then 1
      when p_frenos && array['Miedo al error', 'Presión de tiempo'] then 0.5
      when cardinality(p_frenos) > 0 then 0.2
      else 0
    end
    + case when p_urgencia = 'Hoy' then 0.2 else 0 end);
$$;

create or replace function public.score_closing(p_comparacion text) returns numeric
language sql immutable set search_path = '' as $$
  select case p_comparacion when 'Peor' then 1 when 'Igual' then 0.5 when 'Algo mejor' then 0.25 else 0 end;
$$;

create or replace function public.estado_score(p_estado text) returns int
language sql immutable set search_path = '' as $$
  select case p_estado
    when 'Agotado' then 1 when 'Neutro' then 2 when 'Estable' then 3 when 'Activo' then 4 when 'Enfocado' then 5
    else null
  end;
$$;

create or replace function public.comparacion_score(p_comparacion text) returns int
language sql immutable set search_path = '' as $$
  select case p_comparacion
    when 'Peor' then 1 when 'Igual' then 2 when 'Algo mejor' then 3 when 'Mejor' then 4 when 'Mucho mejor' then 5
    else null
  end;
$$;


-- ── 2. AVISO DE ACTIVIDAD (tiempo real) ──────────────────────────────────

alter table public.teams add column if not exists activity_at timestamptz not null default now();

create or replace function public.bump_team_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  t uuid;
begin
  if tg_table_name in ('diagnoses', 'decisions', 'closings') then
    t := new.team_id;
  elsif tg_table_name = 'profiles' then
    -- Alguien entró a un equipo (o salió): se avisa a los dos.
    if old.team_id is not null then
      update public.teams set activity_at = now() where id = old.team_id;
    end if;
    t := new.team_id;
  else
    -- rituals / totems: el equipo de quien escribió (sin exponer qué escribió).
    select team_id into t from public.profiles where id = new.user_id;
  end if;
  if t is not null then
    update public.teams set activity_at = now() where id = t;
  end if;
  return new;
end;
$$;

drop trigger if exists bump_activity on public.diagnoses;
drop trigger if exists bump_activity on public.decisions;
drop trigger if exists bump_activity on public.closings;
drop trigger if exists bump_activity on public.rituals;
drop trigger if exists bump_activity on public.totems;
drop trigger if exists bump_activity on public.profiles;

create trigger bump_activity after insert on public.diagnoses for each row execute function public.bump_team_activity();
create trigger bump_activity after insert on public.decisions for each row execute function public.bump_team_activity();
create trigger bump_activity after insert on public.closings  for each row execute function public.bump_team_activity();
create trigger bump_activity after insert or update on public.rituals for each row execute function public.bump_team_activity();
create trigger bump_activity after insert or update on public.totems  for each row execute function public.bump_team_activity();
create trigger bump_activity after update of team_id on public.profiles
  for each row when (old.team_id is distinct from new.team_id) execute function public.bump_team_activity();

-- Supabase Realtime transmite los cambios de `teams` (respetando RLS: cada quien solo
-- recibe los de su equipo; la administradora, todos).
do $$
begin
  alter publication supabase_realtime add table public.teams;
exception when duplicate_object then
  null; -- ya estaba
end;
$$;


-- ── 3. TABLERO DEL EQUIPO ────────────────────────────────────────────────
-- Todo lo que muestran Inicio (mapa de puntos), Equipo (patrones) y Ciclo (avance e
-- historial). Solo agregados; nada se calcula con menos de 3 personas.

create or replace function public.get_team_dashboard(p_team uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  min_n constant int := 3;
  -- "Fricción más frecuente" (pantalla Equipo): basta con 2 personas de la misma generación
  -- (decisión del usuario). El resto de patrones sigue pidiendo 3.
  min_friction constant int := 2;
  cur public.cycles;
  week int;
  members int;
  progress jsonb;
  friction jsonb;
  tension jsonb;
  dotmap jsonb;
  history jsonb;
begin
  if p_team is null or (p_team is distinct from public.my_team_id() and not public.is_admin()) then
    raise exception 'forbidden';
  end if;

  perform public.ensure_cycles(p_team);
  select * into cur from public.cycles where team_id = p_team order by number desc limit 1;
  if not found then raise exception 'forbidden'; end if;
  week := least(3, (floor(extract(epoch from (now() - cur.starts_at)) / (7 * 86400)))::int + 1);
  select count(*) into members from public.profiles where team_id = p_team;

  -- Participación del ciclo en curso: cuántas personas respondieron cada módulo.
  select jsonb_build_object(
    'diagnosis', (select count(distinct user_id) from public.diagnoses where cycle_id = cur.id),
    'decision',  (select count(distinct user_id) from public.decisions where cycle_id = cur.id),
    'closing',   (select count(distinct user_id) from public.closings  where cycle_id = cur.id)
  ) into progress;

  -- Fricción por generación (solo generaciones con 2+ respuestas).
  with d as (
    select p.generation as g, public.score_friction(x.sentir, x.actitud) as f
      from public.diagnoses x join public.profiles p on p.id = x.user_id
     where x.cycle_id = cur.id and p.generation is not null
  ), grp as (
    select g, avg(f) as avg_f, sum(f) as sum_f from d group by g having count(*) >= min_friction
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'generation', g,
           'value', round(avg_f, 3),
           'share', case when (select sum(sum_f) from grp) > 0
                         then round(100 * sum_f / (select sum(sum_f) from grp)) else 0 end)
           order by g), '[]'::jsonb)
    into friction from grp;

  -- Temas de tensión del ciclo: frenos de las decisiones + patrones de actitud.
  with themes as (
    select unnest(x.frenos) as label, x.user_id from public.decisions x where x.cycle_id = cur.id
    union all
    select public.actitud_pattern(x.actitud), x.user_id from public.diagnoses x
     where x.cycle_id = cur.id and public.actitud_pattern(x.actitud) is not null
  ), counted as (
    select label, count(*) as n from themes group by label order by n desc, label limit 3
  )
  select case
           when (select count(distinct user_id) from themes) < min_n then '[]'::jsonb
           else coalesce((select jsonb_agg(jsonb_build_object(
                    'label', label, 'value', round(n::numeric / (select max(n) from counted), 3))
                    order by n desc, label) from counted), '[]'::jsonb)
         end
    into tension;

  -- Mapa de puntos: tensión promedio por módulo y generación (+ "mixed" = todo el equipo).
  -- Primero el promedio de cada persona; luego el de cada grupo con 3+ personas.
  with per_user as (
    select 'diagnosis' as module, x.user_id, avg(public.score_friction(x.sentir, x.actitud)) as s
      from public.diagnoses x where x.cycle_id = cur.id group by x.user_id
    union all
    select 'decision', x.user_id, avg(public.score_decision(x.frenos, x.urgencia))
      from public.decisions x where x.cycle_id = cur.id group by x.user_id
    union all
    select 'closing', x.user_id, avg(public.score_closing(x.comparacion))
      from public.closings x where x.cycle_id = cur.id group by x.user_id
  ), labeled as (
    select u.module, coalesce(p.generation, 'none') as g, u.s
      from per_user u join public.profiles p on p.id = u.user_id
  ), cells as (
    select module, g, round(avg(s), 3) as v from labeled where g <> 'none' group by module, g having count(*) >= min_n
    union all
    select module, 'mixed', round(avg(s), 3) from labeled group by module having count(*) >= min_n
  )
  select coalesce(jsonb_object_agg(module, cols), '{}'::jsonb) into dotmap
    from (select module, jsonb_object_agg(g, v) as cols from cells group by module) m;

  -- Historial: cada ciclo con energía, fricción, decisiones y clima de cierre.
  with c as (
    select * from public.cycles where team_id = p_team
  ), diag as (
    select x.cycle_id, count(*) as n, avg(public.estado_score(x.estado)) as energy
      from public.diagnoses x join c on c.id = x.cycle_id group by x.cycle_id
  ), fric as (
    select x.cycle_id, p.generation as g, avg(public.score_friction(x.sentir, x.actitud)) as f
      from public.diagnoses x join c on c.id = x.cycle_id join public.profiles p on p.id = x.user_id
     where p.generation is not null
     group by x.cycle_id, p.generation having count(*) >= min_n
  ), top_fric as (
    select distinct on (cycle_id) cycle_id, g, f from fric order by cycle_id, f desc
  ), dec as (
    select x.cycle_id, count(*) as n from public.decisions x join c on c.id = x.cycle_id group by x.cycle_id
  ), clo as (
    select x.cycle_id, count(*) as n, avg(public.comparacion_score(x.comparacion)) as climate
      from public.closings x join c on c.id = x.cycle_id group by x.cycle_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'number', c.number,
           'startsAt', c.starts_at,
           'endsAt', c.ends_at,
           'current', c.id = cur.id,
           'diagnoses', coalesce(diag.n, 0),
           'energy', case when diag.n >= min_n then round(diag.energy, 1) end,
           -- Generación con más fricción (si supera 0.5), "baja" si nadie la supera, null sin datos.
           'friction', case when top_fric.g is null then null when top_fric.f > 0.5 then top_fric.g else 'baja' end,
           'decisions', coalesce(dec.n, 0),
           'climate', case when clo.n >= min_n then round(clo.climate, 1) end
         ) order by c.number desc), '[]'::jsonb)
    into history
    from c
    left join diag on diag.cycle_id = c.id
    left join top_fric on top_fric.cycle_id = c.id
    left join dec on dec.cycle_id = c.id
    left join clo on clo.cycle_id = c.id;

  return jsonb_build_object(
    'cycle', jsonb_build_object('number', cur.number, 'startsAt', cur.starts_at, 'endsAt', cur.ends_at, 'week', week),
    'members', members,
    'minGroup', min_n,
    'minFriction', min_friction,
    'progress', progress,
    'friction', friction,
    'tension', tension,
    'dotmap', dotmap,
    'history', history
  );
end;
$$;


-- ── 4. VISTA DE LA ADMINISTRADORA ────────────────────────────────────────
-- Uso diario (qué días usó la app cada persona, sin contenido), diferencias de estado por
-- equipo y día (solo agregadas, generaciones con 3+ personas) y temas de tensión de la semana.

create or replace function public.get_admin_overview(p_days int default 14) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  min_n constant int := 3;
  since date := (now() at time zone 'America/Bogota')::date - (p_days - 1);
  activity jsonb;
  daily jsonb;
  tension jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;

  -- Un registro por persona y día: el estado del día (ritual o diagnóstico), si lo hay.
  drop table if exists pg_temp.admin_days;
  create temporary table admin_days on commit drop as
    select user_id, day, round(avg(score), 2) as score
      from (
        select r.user_id, r.day, public.estado_score(r.estado) as score
          from public.rituals r where r.day >= since
        union all
        select x.user_id, (x.saved_at at time zone 'America/Bogota')::date, public.estado_score(x.estado)
          from public.diagnoses x where (x.saved_at at time zone 'America/Bogota')::date >= since
        union all
        select x.user_id, (x.saved_at at time zone 'America/Bogota')::date, null
          from public.decisions x where (x.saved_at at time zone 'America/Bogota')::date >= since
        union all
        select x.user_id, (x.saved_at at time zone 'America/Bogota')::date, null
          from public.closings x where (x.saved_at at time zone 'America/Bogota')::date >= since
      ) s
     group by user_id, day;

  select coalesce(jsonb_object_agg(user_id, days), '{}'::jsonb) into activity
    from (select user_id, jsonb_agg(day order by day) as days from pg_temp.admin_days group by user_id) a;

  -- Por equipo y día: dispersión de estados y promedio por generación (3+ personas).
  with scored as (
    select p.team_id, a.day, p.generation as g, a.score
      from pg_temp.admin_days a join public.profiles p on p.id = a.user_id
     where a.score is not null and p.team_id is not null
  ), spread as (
    select team_id, day, round(stddev_pop(score), 3) as spread
      from scored group by team_id, day having count(*) >= min_n
  ), gens as (
    select team_id, day, jsonb_agg(jsonb_build_object('generation', g, 'avg', round(avg_s, 2))) as generations
      from (select team_id, day, g, avg(score) as avg_s from scored where g is not null
             group by team_id, day, g having count(*) >= min_n) x
     group by team_id, day
  ), per_day as (
    select s.team_id, s.day, jsonb_build_object('spread', s.spread, 'generations', coalesce(g.generations, '[]'::jsonb)) as v
      from spread s left join gens g on g.team_id = s.team_id and g.day = s.day
  )
  select coalesce(jsonb_object_agg(team_id, days), '{}'::jsonb) into daily
    from (select team_id, jsonb_object_agg(day, v) as days from per_day group by team_id) d;

  -- Temas de tensión de los últimos 7 días por equipo (3+ personas con registros).
  with themes as (
    select x.team_id, unnest(x.frenos) as label, x.user_id
      from public.decisions x where x.saved_at >= now() - interval '7 days'
    union all
    select x.team_id, public.actitud_pattern(x.actitud), x.user_id
      from public.diagnoses x
     where x.saved_at >= now() - interval '7 days' and public.actitud_pattern(x.actitud) is not null
    union all
    select x.team_id, x.sentir, x.user_id
      from public.diagnoses x
     where x.saved_at >= now() - interval '7 days' and x.sentir in ('Tensión', 'Desconexión')
  ), eligible as (
    select team_id from themes group by team_id having count(distinct user_id) >= min_n
  ), counted as (
    select t.team_id, t.label, count(*) as n,
           row_number() over (partition by t.team_id order by count(*) desc, t.label) as rk,
           max(count(*)) over (partition by t.team_id) as top_n
      from themes t join eligible e on e.team_id = t.team_id
     group by t.team_id, t.label
  )
  select coalesce(jsonb_object_agg(team_id, rows), '{}'::jsonb) into tension
    from (select team_id, jsonb_agg(jsonb_build_object('label', label, 'value', round(n::numeric / top_n, 3)) order by rk) as rows
            from counted where rk <= 3 group by team_id) x;

  return jsonb_build_object('activity', activity, 'daily', daily, 'tension', tension);
end;
$$;


-- ── 5. PERMISOS ──────────────────────────────────────────────────────────

revoke execute on function public.score_friction(text, text)       from public, anon;
revoke execute on function public.actitud_pattern(text)            from public, anon;
revoke execute on function public.score_decision(text[], text)     from public, anon;
revoke execute on function public.score_closing(text)              from public, anon;
revoke execute on function public.estado_score(text)               from public, anon;
revoke execute on function public.comparacion_score(text)          from public, anon;
revoke execute on function public.bump_team_activity()             from public, anon, authenticated;
revoke execute on function public.get_team_dashboard(uuid)         from public, anon;
revoke execute on function public.get_admin_overview(int)          from public, anon;

grant execute on function public.get_team_dashboard(uuid) to authenticated;
grant execute on function public.get_admin_overview(int)  to authenticated;
