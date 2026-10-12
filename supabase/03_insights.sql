-- ════════════════════════════════════════════════════════════════════════
-- ORA · Fase 7 · Lectura semanal con IA (Gemini)
-- Ejecutar DESPUÉS de 01 y 02: SQL Editor → New query → pegar todo → Run.
-- Se puede volver a ejecutar sin problema.
--
-- Cómo funciona:
--   · Al terminar cada semana del ciclo, la Edge Function "lectura-semanal" escribe una
--     lectura de esa semana con los datos ACUMULADOS del ciclo hasta ese momento.
--   · Se dispara sola la primera vez que alguien del equipo (o la administradora) abre la app
--     después de que termina la semana. Una lectura por equipo, ciclo y semana.
--   · La IA solo recibe agregados anónimos (`insight_input`): nada de nombres, respuestas
--     individuales, Tótem ni rituales, y ningún grupo de menos de 3 personas.
--   · Todo el equipo y la administradora pueden leerlas; nadie puede escribirlas desde la app
--     (solo la Edge Function, con la llave de servicio).
-- ════════════════════════════════════════════════════════════════════════


-- ── 1. TABLA DE LECTURAS ─────────────────────────────────────────────────

create table if not exists public.team_insights (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams (id) on delete cascade,
  cycle_id      uuid not null references public.cycles (id) on delete cascade,
  cycle_number  int  not null,
  week          int  not null check (week between 1 and 3),
  -- ok: lectura generada · insufficient: menos de 3 personas respondieron · error: falló la IA (se reintenta)
  status        text not null check (status in ('ok', 'insufficient', 'error')),
  resumen       text,
  patron        text,
  sugerencia    text,
  -- Los agregados exactos que se enviaron a la IA (para la sustentación y para auditar).
  input         jsonb,
  model         text,
  created_at    timestamptz not null default now(),
  unique (team_id, cycle_id, week)
);
create index if not exists team_insights_team_idx on public.team_insights (team_id, cycle_number, week);

alter table public.team_insights enable row level security;

drop policy if exists "team_insights: integrantes y admin leen" on public.team_insights;
create policy "team_insights: integrantes y admin leen" on public.team_insights
  for select to authenticated
  using (team_id = public.my_team_id() or public.is_admin());


-- ── 2. RESUMEN AGREGADO QUE RECIBE LA IA ─────────────────────────────────
-- Datos del ciclo desde su inicio hasta `p_until` (el final de la semana que se lee).

create or replace function public.insight_input(p_team uuid, p_cycle uuid, p_until timestamptz) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  min_n constant int := 3;
  members int;
  respondents int;
  diag jsonb;
  dec jsonb;
  clo jsonb;
  friction jsonb;
  tension jsonb;
begin
  select count(*) into members from public.profiles where team_id = p_team;

  select count(distinct user_id) into respondents from (
    select user_id from public.diagnoses where cycle_id = p_cycle and saved_at < p_until
    union select user_id from public.decisions where cycle_id = p_cycle and saved_at < p_until
    union select user_id from public.closings  where cycle_id = p_cycle and saved_at < p_until
  ) r;

  -- Ver cómo estamos: energía promedio y cómo se sienten (conteos, solo con 3+ respuestas).
  with d as (select * from public.diagnoses where cycle_id = p_cycle and saved_at < p_until)
  select jsonb_build_object(
    'respuestas', (select count(*) from d),
    'energia_promedio_1a5', case when (select count(*) from d) >= min_n
                                 then round((select avg(public.estado_score(estado)) from d), 1) end,
    'que_sienten', case when (select count(*) from d) >= min_n
                        then (select jsonb_object_agg(sentir, n) from (select sentir, count(*) as n from d where sentir is not null group by sentir) s) end,
    'actitudes_detectadas', case when (select count(*) from d) >= min_n
                                 then (select jsonb_object_agg(p, n) from (select public.actitud_pattern(actitud) as p, count(*) as n from d
                                        where public.actitud_pattern(actitud) is not null group by 1) s) end
  ) into diag;

  -- Tomar una decisión: cuántas, de qué tipo, qué las frena y qué tan urgentes.
  with x as (select * from public.decisions where cycle_id = p_cycle and saved_at < p_until)
  select jsonb_build_object(
    'decisiones', (select count(*) from x),
    'tipos', case when (select count(distinct user_id) from x) >= min_n
                  then (select jsonb_object_agg(tipo, n) from (select tipo, count(*) as n from x where tipo is not null group by tipo) s) end,
    'frenos', case when (select count(distinct user_id) from x) >= min_n
                   then (select jsonb_object_agg(f, n) from (select unnest(frenos) as f, count(*) as n from x group by 1) s) end,
    'urgencias', case when (select count(distinct user_id) from x) >= min_n
                      then (select jsonb_object_agg(urgencia, n) from (select urgencia, count(*) as n from x where urgencia is not null group by urgencia) s) end
  ) into dec;

  -- Cerrar el ciclo: clima de cierre y qué funcionó.
  with c as (select * from public.closings where cycle_id = p_cycle and saved_at < p_until)
  select jsonb_build_object(
    'respuestas', (select count(*) from c),
    'clima_cierre_1a5', case when (select count(*) from c) >= min_n
                             then round((select avg(public.comparacion_score(comparacion)) from c), 1) end,
    'que_funciono', case when (select count(*) from c) >= min_n
                         then (select jsonb_object_agg(funciono, n) from (select funciono, count(*) as n from c where funciono is not null group by funciono) s) end,
    'intenciones', case when (select count(*) from c) >= min_n
                        then (select jsonb_object_agg(i, n) from (select unnest(intenciones) as i, count(*) as n from c group by 1) s) end
  ) into clo;

  -- Fricción percibida por generación (0 a 1), solo generaciones con 3+ respuestas.
  select coalesce(jsonb_object_agg(g, v), '{}'::jsonb) into friction from (
    select p.generation as g, round(avg(public.score_friction(x.sentir, x.actitud)), 2) as v
      from public.diagnoses x join public.profiles p on p.id = x.user_id
     where x.cycle_id = p_cycle and x.saved_at < p_until and p.generation is not null
     group by p.generation having count(*) >= min_n
  ) f;

  -- Tensión promedio del equipo por módulo (0 a 1), con 3+ personas.
  select jsonb_build_object(
    'ver_como_estamos', (select round(avg(s), 2) from (select avg(public.score_friction(sentir, actitud)) as s from public.diagnoses
                          where cycle_id = p_cycle and saved_at < p_until group by user_id) u having count(*) >= min_n),
    'tomar_decision',   (select round(avg(s), 2) from (select avg(public.score_decision(frenos, urgencia)) as s from public.decisions
                          where cycle_id = p_cycle and saved_at < p_until group by user_id) u having count(*) >= min_n),
    'cerrar_ciclo',     (select round(avg(s), 2) from (select avg(public.score_closing(comparacion)) as s from public.closings
                          where cycle_id = p_cycle and saved_at < p_until group by user_id) u having count(*) >= min_n)
  ) into tension;

  return jsonb_build_object(
    'integrantes', members,
    'personas_que_respondieron', respondents,
    'ver_como_estamos', diag,
    'tomar_decision', dec,
    'cerrar_ciclo', clo,
    'friccion_por_generacion_0a1', friction,
    'tension_promedio_por_modulo_0a1', tension
  );
end;
$$;


-- ── 3. PERMISOS ──────────────────────────────────────────────────────────
-- Solo la Edge Function (rol service_role) arma el resumen y asegura los ciclos.

revoke execute on function public.insight_input(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.insight_input(uuid, uuid, timestamptz) to service_role;
grant execute on function public.ensure_cycles(uuid) to service_role;
grant select, insert, update on public.team_insights to service_role;

-- La app se entera de una lectura nueva por el aviso de actividad del equipo (02_patterns.sql).
