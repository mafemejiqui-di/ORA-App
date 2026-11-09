-- ════════════════════════════════════════════════════════════════════════
-- ORA · Aviso "Te extrañamos" tras 3 días laborales sin usar la app
-- Ejecutar DESPUÉS de 01–07: SQL Editor → New query → pegar todo → Run.
-- Se puede volver a ejecutar sin problema.
--
-- Reglas (decididas por el usuario, 2026-11-09):
--   · "Usar la app" = cualquier registro: ritual, Ver cómo estamos, Tomar una decisión o Cerrar el ciclo
--     (la misma regla de las alertas de la administradora).
--   · Cuando alguien completa 3 días laborales seguidos sin usar la app (y con eso pierde la racha),
--     la mañana del siguiente día laboral recibe "Te extrañamos…" EN LUGAR del recordatorio diario.
--     No se repite hasta que vuelva a usar la app y otra vez pase 3 días laborales sin entrar.
--   · Quien nunca ha registrado nada no lo recibe (no tenía racha): sigue con el recordatorio normal.
--
-- Esta función reemplaza a pending_ritual_reminders (06_push.sql) en la Edge Function
-- "recordatorio-diario": devuelve lo mismo y además el último día de uso de cada persona.
-- La cuenta de días laborales (festivos de Colombia) la hace la Edge Function.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.pending_reminders(p_today date)
returns table (id uuid, endpoint text, p256dh text, auth text, last_active date)
language sql stable security definer set search_path = '' as $$
  select s.id, s.endpoint, s.p256dh, s.auth,
         (select max(d) from (
            select max(r.day) as d from public.rituals r where r.user_id = s.user_id and r.day < p_today
            union all
            select max((x.saved_at at time zone 'America/Bogota')::date) from public.diagnoses x
             where x.user_id = s.user_id and (x.saved_at at time zone 'America/Bogota')::date < p_today
            union all
            select max((x.saved_at at time zone 'America/Bogota')::date) from public.decisions x
             where x.user_id = s.user_id and (x.saved_at at time zone 'America/Bogota')::date < p_today
            union all
            select max((x.saved_at at time zone 'America/Bogota')::date) from public.closings x
             where x.user_id = s.user_id and (x.saved_at at time zone 'America/Bogota')::date < p_today
          ) u) as last_active
    from public.push_subscriptions s
    join public.profiles p on p.id = s.user_id
   where not p.is_admin
     and coalesce((p.settings ->> 'dailyRitualReminder')::boolean, true)
     and s.last_sent_on is distinct from p_today
     and not exists (select 1 from public.rituals r where r.user_id = s.user_id and r.day = p_today);
$$;

revoke execute on function public.pending_reminders(date) from public, anon, authenticated;
grant execute on function public.pending_reminders(date) to service_role;
