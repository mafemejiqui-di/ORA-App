// Service worker de ORA: recibe las notificaciones push (recordatorio diario) aunque la app esté
// cerrada y abre la app al tocarlas. No guarda nada en caché: la app siempre carga su versión
// más reciente desde Vercel.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "ORA";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "Tu ritual diario te espera.",
      icon: "/icons/icon-192.png?v=2",
      badge: "/icons/icon-192.png?v=2",
      tag: data.tag || "ora-recordatorio",
      data: { url: data.url || "/ritual" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Si ORA ya está abierta, se lleva al frente y se navega; si no, se abre.
      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
