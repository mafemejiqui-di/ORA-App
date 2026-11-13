-- ════════════════════════════════════════════════════════════════════════
-- ORA · Código de cada perfil (ORA-0001, ORA-0002, …)
-- Cada cuenta recibe un código único al crearse, en orden de registro.
-- Las cuentas que ya existen se numeran por fecha de creación.
-- Nadie lo puede cambiar desde la app (no está en las columnas editables).
-- Se puede volver a ejecutar sin problema.
-- ════════════════════════════════════════════════════════════════════════

create sequence if not exists public.profile_code_seq;

-- Al menos 4 dígitos; si algún día pasa de 9999 sigue creciendo (ORA-10000).
create or replace function public.next_profile_code() returns text
language sql volatile set search_path = '' as $$
  select 'ORA-' || lpad(n::text, greatest(4, length(n::text)), '0')
    from (select nextval('public.profile_code_seq') as n) s;
$$;
-- Solo la usa la base de datos (valor por defecto de la columna), no la app.
revoke execute on function public.next_profile_code() from public, anon, authenticated;

alter table public.profiles add column if not exists code text;

-- Numera las cuentas existentes que aún no tienen código, de la más antigua a la más nueva.
do $$
declare r record;
begin
  for r in select id from public.profiles where code is null order by created_at, id loop
    update public.profiles set code = public.next_profile_code() where id = r.id;
  end loop;
end;
$$;

alter table public.profiles alter column code set default public.next_profile_code();
alter table public.profiles alter column code set not null;

do $$
begin
  alter table public.profiles add constraint profiles_code_key unique (code);
exception when duplicate_object or duplicate_table then
  null; -- ya existía
end;
$$;

-- Integrantes de un equipo, ahora con su código (cambia lo que devuelve: hay que borrarla antes).
drop function if exists public.get_team_members(uuid);
create function public.get_team_members(p_team uuid)
returns table (id uuid, name text, role text, generation text, has_totem boolean, code text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_team is distinct from public.my_team_id() and not public.is_admin() then
    raise exception 'forbidden';
  end if;
  return query
    select p.id, p.name, p.role, p.generation,
           exists (select 1 from public.totems t where t.user_id = p.id),
           p.code
      from public.profiles p
     where p.team_id = p_team
     order by p.created_at;
end;
$$;

revoke execute on function public.get_team_members(uuid) from public, anon;
grant execute on function public.get_team_members(uuid) to authenticated;
