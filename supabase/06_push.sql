-- ════════════════════════════════════════════════════════════════════════
-- ORA · Recordatorio diario como notificación del celular (push)
-- Ejecutar DESPUÉS de 01–05: SQL Editor → New query → pegar todo → Run.
-- Se puede volver a ejecutar sin problema.
--
-- Reglas (decididas por el usuario):
--   · Una sola notificación al día, a las 8:00 a. m. hora de Colombia, todos los días.
--   · Recuerda el ritual diario y "Tomar una decisión".
--   · No se envía a quien ya hizo el ritual de hoy, ni a quien apagó el recordatorio en Perfil.
--
-- Cómo funciona:
--   · Cada celular que activa el recordatorio guarda aquí su "dirección de notificación"
--     (no es un dato personal: es un identificador técnico que entrega el navegador).
--   · Una tarea programada (pg_cron) llama a la Edge Function "recordatorio-diario" entre las
--     8:00 y las 8:45 a. m. (cada 15 minutos, por si algún intento falla). La función envía una
--     sola vez por día a cada celular: los siguientes intentos del mismo día no repiten.
-- ════════════════════════════════════════════════════════════════════════


-- ── 1. CELULARES REGISTRADOS ─────────────────────────────────────────────

create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  user_agent    text,
  -- Último día (hora de Colombia) en que se le envió el recordatorio.
  last_sent_on  date,
  created_at    timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Cada quien registra, ve y borra solo los suyos.
drop policy if exists "push: ver propios" on public.push_subscriptions;
create policy "push: ver propios" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "push: registrar propios" on public.push_subscriptions;
create policy "push: registrar propios" on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "push: actualizar propios" on public.push_subscriptions;
create policy "push: actualizar propios" on public.push_subscriptions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "push: borrar propios" on public.push_subscriptions;
create policy "push: borrar propios" on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- La app solo puede escribir estas columnas (last_sent_on lo maneja la Edge Function).
revoke insert, update on public.push_subscriptions from anon, authenticated;
grant insert (user_id, endpoint, p256dh, auth, user_agent) on public.push_subscriptions to authenticated;
grant update (user_id, endpoint, p256dh, auth, user_agent) on public.push_subscriptions to authenticated;
grant select, insert, update, delete on public.push_subscriptions to service_role;


-- ── 2. A QUIÉN LE TOCA HOY ───────────────────────────────────────────────
-- Celulares con el recordatorio activo, de personas que aún no hacen el ritual de hoy
-- y a los que todavía no se les envió hoy. La administradora no recibe recordatorios.

create or replace function public.pending_ritual_reminders(p_today date)
returns table (id uuid, endpoint text, p256dh text, auth text)
language sql stable security definer set search_path = '' as $$
  select s.id, s.endpoint, s.p256dh, s.auth
    from public.push_subscriptions s
    join public.profiles p on p.id = s.user_id
   where not p.is_admin
     and coalesce((p.settings ->> 'dailyRitualReminder')::boolean, true)
     and s.last_sent_on is distinct from p_today
     and not exists (select 1 from public.rituals r where r.user_id = s.user_id and r.day = p_today);
$$;

revoke execute on function public.pending_ritual_reminders(date) from public, anon, authenticated;
grant execute on function public.pending_ritual_reminders(date) to service_role;


-- ── 3. TAREA PROGRAMADA: 8:00 A. M. HORA DE COLOMBIA ─────────────────────
-- Colombia es UTC-5 todo el año (sin horario de verano): 8:00 a. m. = 13:00 UTC.
-- Se llama con la llave pública (anon) del proyecto: la función solo envía después de las
-- 8:00 a. m. y una vez por día, así que llamarla de más no repite notificaciones.

create extension if not exists pg_net;

do $$
begin
  perform cron.unschedule('ora-recordatorio-diario');
exception when others then
  null; -- no existía
end;
$$;

select cron.schedule(
  'ora-recordatorio-diario',
  '*/15 13 * * *',
  $cron$
  select net.http_post(
    url := 'https://buzegalseweakdkbszkg.supabase.co/functions/v1/recordatorio-diario',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1emVnYWxzZXdlYWtka2JzemtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NjM4ODAsImV4cCI6MjEwNzMzOTg4MH0.NzmO_zyc9FXY1bdN6gUBeKI_eP9EUbGRfxsv2FGlakA'
    ),
    body := '{}'::jsonb
  );
  $cron$
);
