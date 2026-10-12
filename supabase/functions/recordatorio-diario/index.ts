// ORA · Edge Function "recordatorio-diario"
// Envía el recordatorio diario (ritual + "Tomar una decisión") como notificación del celular.
//
// - La llama la tarea programada "ora-recordatorio-diario" (06_push.sql) entre las 8:00 y las
//   8:45 a. m. hora de Colombia. Solo envía después de las 8:00 y una vez por día a cada celular.
// - No se envía a quien ya hizo el ritual de hoy ni a quien apagó el recordatorio en Perfil.
// - Secretos necesarios en Supabase → Edge Functions → Secrets (están en el archivo vapid.local):
//     VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
//   SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya vienen incluidos en toda Edge Function.
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const BOGOTA_OFFSET_MS = -5 * 3_600_000; // Colombia: UTC-5 todo el año.
const SEND_FROM_HOUR = 8;

const PAYLOAD = JSON.stringify({
  title: "ORA",
  body: "Tu ritual diario te espera. Si hoy enfrentas una decisión con tu equipo, regístrala en «Tomar una decisión».",
  url: "/ritual",
  tag: "ora-recordatorio",
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

type Subscription = { id: string; endpoint: string; p256dh: string; auth: string };

Deno.serve(async () => {
  try {
    const bogota = new Date(Date.now() + BOGOTA_OFFSET_MS);
    if (bogota.getUTCHours() < SEND_FROM_HOUR) return json({ skipped: "Antes de las 8:00 a. m. en Colombia" });
    const today = bogota.toISOString().slice(0, 10);

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
