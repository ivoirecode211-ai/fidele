/*
 * Service worker de l'espace patient MA SANTÉ.
 * Reçoit les notifications (rappels de médicaments, messages des médecins)
 * même lorsque l'application est fermée, et ouvre la bonne page au toucher.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(data.title || "MA SANTÉ", {
    body: data.body || "",
    tag: data.tag || undefined,
    icon: "/images/marque.svg",
    badge: "/images/marque.svg",
    vibrate: [200, 100, 200],
    requireInteraction: Boolean(data.tag && data.tag.startsWith("prise-")),
    data: { url: data.url || "/patient/espace" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/patient/espace", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const open = windows.find((w) => w.url.includes("/patient"));
    if (open) { await open.navigate(url); return open.focus(); }
    return self.clients.openWindow(url);
  })());
});
