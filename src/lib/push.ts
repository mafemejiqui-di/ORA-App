// Notificaciones push (recordatorio diario del ritual a las 8:00 a. m.).
// El celular se registra con la llave pública VAPID de ORA y su "dirección de notificación"
// se guarda en Supabase (tabla push_subscriptions). Ver supabase/06_push.sql y
// supabase/functions/recordatorio-diario.
import { supabase } from "./supabase";

/** Llave pública VAPID de ORA (pública por diseño; la privada vive solo en Supabase). */
const VAPID_PUBLIC_KEY = "BLyq3rrcqWm-loPlizmZ6ghGmpWC4oca4Cb7pf5LOudoTgmJmtd-OLeIPThW4TSWjhQama2TYHhFTl0whYcxiYU";

export type PushStatus =
  /** El navegador no permite notificaciones (en iPhone: la app no está instalada en la pantalla de inicio). */
  | "unsupported"
  /** La persona bloqueó las notificaciones de ORA en los ajustes del celular. */
  | "denied"
  /** Este celular recibe los recordatorios. */
  | "subscribed"
  /** Disponible pero sin activar en este celular. */
  | "off";

export function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** Registra el service worker al abrir la app (necesario para recibir notificaciones). */
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => console.warn("[ORA] service worker", err));
  });
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function currentSubscription() {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    return (await currentSubscription()) ? "subscribed" : "off";
  } catch {
    return "off";
  }
}

/**
 * Pide permiso (debe llamarse desde un toque de la persona) y registra este celular.
 * Devuelve el estado final.
 */
export async function enablePush(): Promise<PushStatus> {
  if (!isPushSupported()) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  const json = subscription.toJSON();
  const { data } = await supabase.auth.getUser();
  if (!data.user || !json.endpoint || !json.keys) throw new Error("No se pudo registrar el celular");
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: data.user.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent.slice(0, 200),
    },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
  return "subscribed";
}

/** Deja de recibir recordatorios en este celular. */
export async function disablePush(): Promise<void> {
  if (!isPushSupported()) return;
  const subscription = await currentSubscription().catch(() => null);
  if (!subscription) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
  await subscription.unsubscribe().catch(() => undefined);
}
