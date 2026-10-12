-- ════════════════════════════════════════════════════════════════════════
-- ORA · Fase 1 · Esquema de la base de datos
-- Ejecutar UNA vez en Supabase → SQL Editor → New query → pegar todo → Run.
-- (Si ya ejecutaste una versión anterior de este archivo, corre antes 00_reset.sql.)
--
-- Contenido:
--   1. Tablas (equipos, perfiles, ciclos y registros de cada módulo)
--   2. Ciclos automáticos
--   3. Funciones de apoyo (¿de qué equipo soy?, ¿soy admin?)
--   4. Perfil automático al crear una cuenta
--   5. Reglas de privacidad (RLS)
--   6. Acciones con reglas de negocio (equipos, guardar respuestas, …)
--   7. Tarea programada (pg_cron) y permisos
--
-- Reglas de ciclo (decididas por el usuario):
--   · El ciclo 1 arranca en el momento en que se crea el equipo.
--   · Cada ciclo dura 3 semanas de 7 días contadas desde ese momento, y el siguiente
--     empieza enseguida, sin pausa.
--   · Semana 1: "Ver cómo estamos" · Semana 2: "Tomar una decisión" (destacado)
--     · Semana 3: "Cerrar el ciclo".
--   · "Ver cómo estamos" solo se responde en la semana 1 y "Cerrar el ciclo" solo en la 3.
--     "Tomar una decisión" queda abierto siempre (uso puntual).
--   · No hay control manual: nadie inicia ni activa fases.
--
-- Los patrones del equipo (fórmula aprobada) llegan en la fase 5 en otro archivo.
-- Los errores de negocio se lanzan con un código corto (p. ej. 'team-code-not-found')
-- que la app traduce a mensajes en español.
-- ════════════════════════════════════════════════════════════════════════


-- ── 1. TABLAS ────────────────────────────────────────────────────────────

create table public.teams (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(btrim(name)) between 1 and 80),
  -- Código para unirse, formato XXXX-0000 (como el de la app).
  code          text not null unique check (code ~ '^[A-Z]{4}-[0-9]{4}$'),
  created_by    uuid references auth.users (id) on delete set null,
  -- Inicio del ciclo 1; todos los ciclos siguientes se cuentan desde aquí.
  cycle_anchor  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null check (length(btrim(name)) between 1 and 80),
  email       text not null unique,
  role        text check (role in ('Diseñador Industrial', 'Practicante', 'Líder',
                                   'Diseñador Gráfico', 'Coordinador', 'Otro')),
  generation  text check (generation in ('boomers', 'gen-x', 'millennials', 'gen-z')),
  team_id     uuid references public.teams (id) on delete set null,
  -- Perfil de administradora: ve todos los equipos. Solo se activa desde el SQL Editor.
  is_admin    boolean not null default false,
  settings    jsonb not null default '{"dailyRitualReminder": true, "cycleReminder": true}',
  created_at  timestamptz not null default now()
);
create index profiles_team_idx on public.profiles (team_id);

-- Un ciclo por fila (las crea la base de datos sola, ver sección 2).
-- El historial de ciclos sale de aquí.
create table public.cycles (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams (id) on delete cascade,
  number     int  not null check (number > 0),
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  unique (team_id, number)
);

-- Postura de liderazgo (Tótem). PRIVADO: solo lo ve su dueño.
create table public.totems (
  user_id       uuid primary key references public.profiles (id) on delete cascade,
  persona       text not null check (length(btrim(persona)) > 0),
  equipo_sobra  text not null check (length(btrim(equipo_sobra)) > 0),
  equipo_falta  text not null check (length(btrim(equipo_falta)) > 0),
  accion        text not null default '',
  saved_at      timestamptz not null default now()
);

-- Ritual diario. PRIVADO. Uno por día local (YYYY-MM-DD); reabrirlo lo reemplaza.
create table public.rituals (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  day          date not null,
  estado       text,
  reflexiones  text[] not null default '{}',
  intencion    text,
  saved_at     timestamptz not null default now(),
  primary key (user_id, day)
);

-- "Ver cómo estamos". Uno por persona y ciclo, solo en la semana 1.
create table public.diagnoses (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.profiles (id) on delete cascade,
  team_id   uuid not null references public.teams (id) on delete cascade,
  cycle_id  uuid not null references public.cycles (id) on delete cascade,
  estado    text,
  sentir    text,
  actitud   text,
  saved_at  timestamptz not null default now(),
  unique (user_id, cycle_id)
);
create index diagnoses_team_idx on public.diagnoses (team_id, cycle_id);

-- "Tomar una decisión". Uso puntual: puede haber varias por ciclo.
create table public.decisions (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.profiles (id) on delete cascade,
  team_id   uuid not null references public.teams (id) on delete cascade,
  cycle_id  uuid not null references public.cycles (id) on delete cascade,
  tipo      text,
  frenos    text[] not null default '{}' check (cardinality(frenos) <= 2),
  urgencia  text,
  saved_at  timestamptz not null default now()
);
create index decisions_team_idx on public.decisions (team_id, cycle_id);

-- "Cierre del ciclo". Uno por persona y ciclo, solo en la semana 3.
create table public.closings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  team_id      uuid not null references public.teams (id) on delete cascade,
  cycle_id     uuid not null references public.cycles (id) on delete cascade,
  comparacion  text,
  funciono     text,
  intenciones  text[] not null default '{}' check (cardinality(intenciones) <= 2),
  saved_at     timestamptz not null default now(),
  unique (user_id, cycle_id)
);
create index closings_team_idx on public.closings (team_id, cycle_id);


-- ── 2. CICLOS AUTOMÁTICOS ────────────────────────────────────────────────

-- Número de ciclo que corresponde a un instante, contando desde el ancla del equipo.
create function public.cycle_number_at(p_anchor timestamptz, p_at timestamptz) returns int
language sql immutable set search_path = '' as $$
  select (floor(extract(epoch from (p_at - p_anchor)) / (21 * 86400)))::int + 1;
$$;

-- Crea las filas de ciclo que falten hasta hoy para un equipo (idempotente).
create function public.ensure_cycles(p_team uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  anchor timestamptz;
begin
  select cycle_anchor into anchor from public.teams where id = p_team;
  if anchor is null then return; end if;
  insert into public.cycles (team_id, number, starts_at, ends_at)
    select p_team, n,
           anchor + (n - 1) * interval '21 days',
           anchor + n * interval '21 days'
      from generate_series(1, greatest(public.cycle_number_at(anchor, now()), 1)) as n
    on conflict (team_id, number) do nothing;
end;
$$;

-- Para la tarea programada: pone al día los ciclos de todos los equipos.
create function public.ensure_all_cycles() returns void
language plpgsql security definer set search_path = '' as $$
declare
  t uuid;
begin
  for t in select id from public.teams loop
    perform public.ensure_cycles(t);
  end loop;
end;
$$;


-- ── 3. FUNCIONES DE APOYO ────────────────────────────────────────────────
-- "security definer" para que las reglas RLS puedan consultarlas sin caer en bucles.

create function public.my_team_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select team_id from public.profiles where id = auth.uid();
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;


-- ── 4. PERFIL AUTOMÁTICO AL CREAR UNA CUENTA ─────────────────────────────
-- La app envía nombre, rol y generación como metadatos del registro.
-- is_admin y team_id NUNCA se toman de lo que envía la app.

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name, email, role, generation)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    lower(new.email),
    nullif(new.raw_user_meta_data ->> 'role', ''),
    nullif(new.raw_user_meta_data ->> 'generation', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ── 5. REGLAS DE PRIVACIDAD (RLS) ────────────────────────────────────────

alter table public.teams     enable row level security;
alter table public.profiles  enable row level security;
alter table public.cycles    enable row level security;
alter table public.totems    enable row level security;
alter table public.rituals   enable row level security;
alter table public.diagnoses enable row level security;
alter table public.decisions enable row level security;
alter table public.closings  enable row level security;

-- Equipos y ciclos: los ven sus integrantes y la administradora.
-- Se crean solo con las funciones de las secciones 2 y 6.
create policy "teams: integrantes y admin leen" on public.teams
  for select to authenticated
  using (id = public.my_team_id() or public.is_admin());

create policy "cycles: integrantes y admin leen" on public.cycles
  for select to authenticated
  using (team_id = public.my_team_id() or public.is_admin());

-- Perfiles: cada quien ve el suyo y los de su equipo; la admin ve todos.
create policy "profiles: propio, compañeros y admin leen" on public.profiles
  for select to authenticated
  using (id = auth.uid() or (team_id is not null and team_id = public.my_team_id()) or public.is_admin());

create policy "profiles: cada quien edita el suyo" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Solo estas columnas se pueden editar desde la app (no is_admin, team_id, email ni rol).
revoke update on public.profiles from anon, authenticated;
grant update (name, generation, settings) on public.profiles to authenticated;

-- Tótem y rituales: estrictamente privados (ni la admin los lee).
create policy "totems: solo su dueño" on public.totems
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "rituals: solo su dueño" on public.rituals
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Diagnósticos, decisiones y cierres: cada quien lee los suyos. Se guardan SOLO con las
-- funciones save_* (sección 6), que aplican las semanas del ciclo. Sin update/delete:
-- "una por ciclo; después solo se pueden ver". Los agregados del equipo y de la admin
-- salen de funciones (fase 5), nunca de filas individuales.
create policy "diagnoses: leer propios" on public.diagnoses
  for select to authenticated using (user_id = auth.uid());
create policy "decisions: leer propias" on public.decisions
  for select to authenticated using (user_id = auth.uid());
create policy "closings: leer propios" on public.closings
  for select to authenticated using (user_id = auth.uid());


-- ── 6. ACCIONES CON REGLAS DE NEGOCIO ────────────────────────────────────

-- Registro paso 1: avisar si el correo ya tiene cuenta (se puede llamar sin sesión).
create function public.is_email_taken(p_email text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where email = lower(btrim(p_email)));
$$;

-- Registro paso 3: comprobar un código de equipo antes de crear la cuenta (sin sesión).
create function public.team_code_exists(p_code text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.teams where code = upper(btrim(p_code)));
$$;

-- Unirse a un equipo existente con su código.
create function public.join_team(p_code text) returns public.teams
language plpgsql security definer set search_path = '' as $$
declare
  t public.teams;
begin
  if auth.uid() is null then raise exception 'not-authenticated'; end if;
  select * into t from public.teams where code = upper(btrim(p_code));
  if not found then raise exception 'team-code-not-found'; end if;
  update public.profiles set team_id = t.id where id = auth.uid();
  return t;
end;
$$;

-- Crear un equipo nuevo (con código único) y quedar dentro de él. Su ciclo 1 arranca ya.
create function public.create_team(p_name text) returns public.teams
language plpgsql security definer set search_path = '' as $$
declare
  t public.teams;
  new_code text;
begin
  if auth.uid() is null then raise exception 'not-authenticated'; end if;
  if length(btrim(coalesce(p_name, ''))) = 0 then raise exception 'team-name-required'; end if;
  loop
    new_code :=
      (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + floor(random() * 24)::int, 1), '')
         from generate_series(1, 4))
      || '-' || lpad(floor(random() * 10000)::int::text, 4, '0');
    exit when not exists (select 1 from public.teams where code = new_code);
  end loop;
  insert into public.teams (name, code, created_by)
    values (btrim(p_name), new_code, auth.uid())
    returning * into t;
  perform public.ensure_cycles(t.id);
  update public.profiles set team_id = t.id where id = auth.uid();
  return t;
end;
$$;

-- Ciclo en curso de MI equipo, con la semana (1, 2 o 3). Si al ciclo nuevo aún no le
-- ha creado fila la tarea programada, se crea aquí mismo.
create function public.get_current_cycle()
returns table (id uuid, number int, starts_at timestamptz, ends_at timestamptz, week int)
language plpgsql security definer set search_path = '' as $$
declare
  my_team uuid := public.my_team_id();
begin
  if my_team is null then return; end if;
  perform public.ensure_cycles(my_team);
  return query
    select c.id, c.number, c.starts_at, c.ends_at,
           least(3, (floor(extract(epoch from (now() - c.starts_at)) / (7 * 86400)))::int + 1)
      from public.cycles c
     where c.team_id = my_team
     order by c.number desc
     limit 1;
end;
$$;

-- Guardar "Ver cómo estamos": solo semana 1, una vez por ciclo.
create function public.save_diagnosis(p_estado text, p_sentir text, p_actitud text)
returns public.diagnoses
language plpgsql security definer set search_path = '' as $$
declare
  c record;
  d public.diagnoses;
begin
  select * into c from public.get_current_cycle();
  if not found then raise exception 'no-team'; end if;
  if c.week <> 1 then raise exception 'outside-window'; end if;
  insert into public.diagnoses (user_id, team_id, cycle_id, estado, sentir, actitud)
    values (auth.uid(), public.my_team_id(), c.id, p_estado, p_sentir, p_actitud)
    returning * into d;
  return d;
exception when unique_violation then
  raise exception 'already-answered';
end;
$$;

-- Registrar "Tomar una decisión": abierto siempre, queda en el ciclo en curso.
create function public.save_decision(p_tipo text, p_frenos text[], p_urgencia text)
returns public.decisions
language plpgsql security definer set search_path = '' as $$
declare
  c record;
  d public.decisions;
begin
  select * into c from public.get_current_cycle();
  if not found then raise exception 'no-team'; end if;
  insert into public.decisions (user_id, team_id, cycle_id, tipo, frenos, urgencia)
    values (auth.uid(), public.my_team_id(), c.id, p_tipo, coalesce(p_frenos, '{}'), p_urgencia)
    returning * into d;
  return d;
end;
$$;

-- Guardar "Cierre del ciclo": solo semana 3, una vez por ciclo.
create function public.save_closing(p_comparacion text, p_funciono text, p_intenciones text[])
returns public.closings
language plpgsql security definer set search_path = '' as $$
declare
  c record;
  d public.closings;
begin
  select * into c from public.get_current_cycle();
  if not found then raise exception 'no-team'; end if;
  if c.week <> 3 then raise exception 'outside-window'; end if;
  insert into public.closings (user_id, team_id, cycle_id, comparacion, funciono, intenciones)
    values (auth.uid(), public.my_team_id(), c.id, p_comparacion, p_funciono, coalesce(p_intenciones, '{}'))
    returning * into d;
  return d;
exception when unique_violation then
  raise exception 'already-answered';
end;
$$;

-- Integrantes de un equipo con el triángulo del Tótem, sin exponer el Tótem en sí.
create function public.get_team_members(p_team uuid)
returns table (id uuid, name text, role text, generation text, has_totem boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_team is distinct from public.my_team_id() and not public.is_admin() then
    raise exception 'forbidden';
  end if;
  return query
    select p.id, p.name, p.role, p.generation,
           exists (select 1 from public.totems t where t.user_id = p.id)
      from public.profiles p
     where p.team_id = p_team
     order by p.created_at;
end;
$$;


-- ── 7. TAREA PROGRAMADA Y PERMISOS ───────────────────────────────────────

-- Cada hora (minuto 5) se crean los ciclos nuevos de todos los equipos, aunque nadie
-- abra la app. Así el historial y la vista de administradora quedan siempre al día.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('ora-ensure-cycles', '5 * * * *', 'select public.ensure_all_cycles()');

-- Por defecto Postgres deja ejecutar cualquier función a todos: se cierra y se abre solo lo necesario.
revoke execute on all functions in schema public from public, anon, authenticated;

-- Sin sesión (pantallas de registro):
grant execute on function public.is_email_taken(text)   to anon, authenticated;
grant execute on function public.team_code_exists(text) to anon, authenticated;

-- Con sesión:
grant execute on function public.my_team_id()                          to authenticated;
grant execute on function public.is_admin()                            to authenticated;
grant execute on function public.cycle_number_at(timestamptz, timestamptz) to authenticated;
grant execute on function public.join_team(text)                       to authenticated;
grant execute on function public.create_team(text)                     to authenticated;
grant execute on function public.get_current_cycle()                   to authenticated;
grant execute on function public.save_diagnosis(text, text, text)      to authenticated;
grant execute on function public.save_decision(text, text[], text)     to authenticated;
grant execute on function public.save_closing(text, text, text[])      to authenticated;
grant execute on function public.get_team_members(uuid)                to authenticated;
-- ensure_cycles / ensure_all_cycles / handle_new_user: solo uso interno (sin grant).
