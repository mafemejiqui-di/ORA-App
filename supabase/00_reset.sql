-- ════════════════════════════════════════════════════════════════════════
-- ORA · Reinicio de la base de datos
-- ⚠️  BORRA TODAS las tablas de ORA y sus datos. Úsalo SOLO mientras la base
--     esté vacía (desarrollo), para volver a correr 01_schema.sql desde cero.
-- No borra las cuentas de Authentication: si creaste alguna de prueba, bórrala en
-- Authentication → Users.
-- ════════════════════════════════════════════════════════════════════════

do $$
begin
  perform cron.unschedule('ora-ensure-cycles');
exception when others then
  null; -- no existía la tarea o pg_cron no está activo
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

drop table if exists
  public.closings, public.decisions, public.diagnoses, public.rituals,
  public.totems, public.cycles, public.profiles, public.teams
  cascade;

drop function if exists
  public.handle_new_user(),
  public.my_team_id(),
  public.is_admin(),
  public.is_leader(),
  public.current_cycle_id(uuid),
  public.cycle_number_at(timestamptz, timestamptz),
  public.ensure_cycles(uuid),
  public.ensure_all_cycles(),
  public.is_email_taken(text),
  public.team_code_exists(text),
  public.join_team(text),
  public.create_team(text),
  public.activate_phase(text),
  public.get_current_cycle(),
  public.save_diagnosis(text, text, text),
  public.save_decision(text, text[], text),
  public.save_closing(text, text, text[]),
  public.get_team_members(uuid)
  cascade;
