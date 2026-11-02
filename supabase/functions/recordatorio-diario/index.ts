// ORA · Edge Function "recordatorio-diario"
// Envía el recordatorio diario del ritual como notificación del celular.
//
// - La llama la tarea programada "ora-recordatorio-diario" (06_push.sql) entre las 8:00 y las
//   8:45 a. m. hora de Colombia. Solo envía después de las 8:00 y una vez por día a cada celular.
// - No se envía a quien ya hizo el ritual de hoy ni a quien apagó el recordatorio en Perfil.
// - Solo se envía en días laborales: lunes a viernes que no sean festivo en Colombia (misma
//   regla que src/utils/workdays.ts, donde la racha tampoco cuenta esos días).
// - Secretos necesarios en Supabase → Edge Functions → Secrets (están en el archivo vapid.local):
//     VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
//   SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya vienen incluidos en toda Edge Function.
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const BOGOTA_OFFSET_MS = -5 * 3_600_000; // Colombia: UTC-5 todo el año.
const SEND_FROM_HOUR = 8;

const PAYLOAD = JSON.stringify({
  title: "ORA",
  body: "Tu ritual diario te espera.",
  url: "/ritual",
  tag: "ora-recordatorio",
});

// Festivos de Colombia (Ley 51 de 1983), en UTC: aquí las fechas se manejan como días de calendario.
function colombianHolidays(year: number): Set<string> {
  const day = (m: number, d: number) => new Date(Date.UTC(year, m, d));
  const shift = (date: Date, n: number) => new Date(date.getTime() + n * 86_400_000);
  const toMonday = (date: Date) => shift(date, (8 - date.getUTCDay()) % 7);
  // Domingo de Pascua (Meeus/Jones/Butcher).
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const easter = day(Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
  return new Set(
    [
      day(0, 1), day(4, 1), day(6, 20), day(7, 7), day(11, 8), day(11, 25),
      shift(easter, -3), shift(easter, -2),
      toMonday(day(0, 6)), toMonday(day(2, 19)), toMonday(day(5, 29)), toMonday(day(7, 15)),
      toMonday(day(9, 12)), toMonday(day(10, 1)), toMonday(day(10, 11)),
      toMonday(shift(easter, 39)), toMonday(shift(easter, 60)), toMonday(shift(easter, 68)),
    ].map((date) => date.toISOString().slice(0, 10)),
  );
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

type Subscription = { id: string; endpoint: string; p256dh: string; auth: string };

Deno.serve(async () => {
  try {
    const bogota = new Date(Date.now() + BOGOTA_OFFSET_MS);
    if (bogota.getUTCHours() < SEND_FROM_HOUR) return json({ skipped: "Antes de las 8:00 a. m. en Colombia" });
    const today = bogota.toISOString().slice(0, 10);
    const weekday = bogota.getUTCDay();
    if (weekday === 0 || weekday === 6) return json({ skipped: "Fin de semana" });
    if (colombianHolidays(bogota.getUTCFullYear()).has(today)) return json({ skipped: "Festivo en Colombia" });

    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const subject = Deno.env.get("VAPID_SUBJECT") || "mailto:mafemejia.di@gmail.com";
    if (!publicKey || !privateKey) throw new Error("Faltan los secretos VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY");
    webpush.setVapidDetails(subject, publicKey, privateKey);

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const { data, error } = await service.rpc("pending_ritual_reminders", { p_today: today });
    if (error) throw error;
    const subs = (data ?? []) as Subscription[];

    const sent: string[] = [];
    const gone: string[] = [];
    let failed = 0;
    const results = await Promise.allSettled(
      subs.map((s) =>
        webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, PAYLOAD, {
          TTL: 6 * 3600, // si el celular está apagado, se entrega hasta 6 horas después
        }),
      ),
    );
    results.forEach((result, i) => {
      if (result.status === "fulfilled") sent.push(subs[i].id);
      else {
        const status = (result.reason as { statusCode?: number })?.statusCode;
        // 404/410: el celular desinstaló la app o revocó el permiso: se borra el registro.
        if (status === 404 || status === 410) gone.push(subs[i].id);
        else {
          failed++;
          console.error("push falló", status, result.reason);
        }
      }
    });

    if (sent.length) await service.from("push_subscriptions").update({ last_sent_on: today }).in("id", sent);
    if (gone.length) await service.from("push_subscriptions").delete().in("id", gone);

    return json({ today, pending: subs.length, sent: sent.length, removed: gone.length, failed });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
