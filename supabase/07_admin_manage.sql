-- ════════════════════════════════════════════════════════════════════════
-- ORA · Gestión de la administradora: integrantes, Tótems y equipos
-- Ejecutar DESPUÉS de 01–06: SQL Editor → New query → pegar todo → Run.
-- Se puede volver a ejecutar sin problema.
--
-- Decisiones del usuario:
--   · La admin puede SACAR a una persona de su equipo (la cuenta sigue y queda sin equipo;
--     puede volver a unirse con un código) o ELIMINAR su cuenta (se borran la cuenta y
--     todos sus registros, para siempre).
--   · La admin puede leer el Tótem de cada integrante (antes era privado incluso para ella).
--     El Tótem se lee solo por estas funciones; la tabla sigue cerrada para todos los demás.
--   · Al ELIMINAR un equipo se borran el equipo, sus ciclos, respuestas y lecturas; sus
--     integrantes conservan la cuenta y quedan sin equipo.
-- Nadie puede sacar ni eliminar a otra administradora (ni a sí misma) desde la app.
-- ════════════════════════════════════════════════════════════════════════

-- Tótems de los integrantes de un equipo (solo la admin).
create or replace function public.admin_get_team_totems(p_team uuid)
returns table (user_id uuid, persona text, equipo_sobra text, equipo_falta text, accion text, saved_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
    select t.user_id, t.persona, t.equipo_sobra, t.equipo_falta, t.accion, t.saved_at
      from public.totems t
      join public.profiles p on p.id = t.user_id
     where p.team_id = p_team;
end;
$$;

-- Saca a una persona de su equipo: conserva la cuenta y sus registros, queda sin equipo.
create or replace function public.admin_remove_member(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if exists (select 1 from public.profiles where id = p_user and is_admin) then
    raise exception 'cannot-manage-admin';
  end if;
  update public.profiles set team_id = null where id = p_user;
  if not found then raise exception 'not-found'; end if;
end;
$$;

-- Elimina la cuenta: borra el usuario de Auth y, en cascada, su perfil, Tótem, rituales,
-- respuestas y suscripciones a notificaciones.
create or replace function public.admin_delete_user(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_user = auth.uid() or exists (select 1 from public.profiles where id = p_user and is_admin) then
    raise exception 'cannot-manage-admin';
  end if;
  delete from auth.users where id = p_user;
  if not found then raise exception 'not-found'; end if;
end;
$$;

-- Elimina un equipo: sus integrantes quedan sin equipo (team_id → null) y se borran en
-- cascada sus ciclos, diagnósticos, decisiones, cierres y lecturas semanales.
create or replace function public.admin_delete_team(p_team uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.profiles set team_id = null where team_id = p_team;
  delete from public.teams where id = p_team;
  if not found then raise exception 'not-found'; end if;
end;
$$;

revoke execute on function public.admin_get_team_totems(uuid) from public, anon;
revoke execute on function public.admin_remove_member(uuid)   from public, anon;
revoke execute on function public.admin_delete_user(uuid)     from public, anon;
revoke execute on function public.admin_delete_team(uuid)     from public, anon;
grant execute on function public.admin_get_team_totems(uuid) to authenticated;
grant execute on function public.admin_remove_member(uuid)   to authenticated;
grant execute on function public.admin_delete_user(uuid)     to authenticated;
grant execute on function public.admin_delete_team(uuid)     to authenticated;
