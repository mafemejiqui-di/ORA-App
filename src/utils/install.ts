// Instalación de la web app: si se abre desde el navegador se muestra el instructivo;
// si se abre desde el ícono de la pantalla de inicio, la app normal.

/** Evento de Chrome/Android para mostrar el diálogo de instalación propio. */
export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type Platform = "ios" | "android" | "desktop";

/** Vista previa en el navegador (para revisar la app sin instalarla): ?vista=app / ?vista=instructivo. */
const PREVIEW_KEY = "ora.previewInBrowser";

/** true si la app se abrió desde el ícono instalado (pantalla completa, sin barra del navegador). */
export function isInstalledApp() {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches;
}

/** Permite ver la app en el navegador (diseño y pruebas). Se activa una vez con ?vista=app y se recuerda. */
export function isBrowserPreview() {
  try {
    const vista = new URLSearchParams(window.location.search).get("vista");
    if (vista === "app") localStorage.setItem(PREVIEW_KEY, "1");
    if (vista === "instructivo") localStorage.removeItem(PREVIEW_KEY);
    return localStorage.getItem(PREVIEW_KEY) === "1";
  } catch {
    return false;
  }
}

export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  // iPadOS se presenta como Mac, pero tiene pantalla táctil.
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

/** Navegadores internos (Instagram, Facebook, WhatsApp…) no permiten instalar: hay que abrir el enlace en Safari o Chrome. */
export function isInAppBrowser() {
  return /Instagram|FBAN|FBAV|FB_IAB|WhatsApp|Line\/|TikTok|Snapchat/i.test(navigator.userAgent);
}

// El aviso de instalación de Chrome puede llegar antes de que se pinte la guía: se guarda aquí.
let deferredPrompt: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event as InstallPromptEvent;
  notify();
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  installed = true;
  notify();
});

export function getInstallState() {
  return { canPrompt: deferredPrompt !== null, installed };
}

export function subscribeInstall(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Abre el diálogo de instalación de Chrome (solo Android/Chrome lo ofrece). */
export async function promptInstall() {
  if (!deferredPrompt) return false;
  const event = deferredPrompt;
  deferredPrompt = null;
  await event.prompt();
  const choice = await event.userChoice;
  notify();
  return choice.outcome === "accepted";
}
