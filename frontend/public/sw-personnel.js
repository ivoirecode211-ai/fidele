/*
 * Service worker du personnel MA SANTÉ.
 * Reçoit les notifications (patient en attente, ordonnance, message…) même
 * application fermée, et ouvre le bon module au toucher. Il ne gère aucune
 * requête : sa portée (/personnel/) ne recouvre pas celle de l'espace patient.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(data.title || "MA SANTÉ", {
    body: data.body || "",
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    icon: "/images/marque.svg",
    badge: "/images/marque.svg",
    vibrate: [200, 100, 200],
    data: { url: data.url || "/modules" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/modules", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const open = windows.find((w) => new URL(w.url).origin === self.location.origin && !new URL(w.url).pathname.startsWith("/patient"));
    // La page n'est pas contrôlée par ce service worker : elle change de module elle-même.
    if (open) { open.postMessage({ type: "ms-ouvrir", url }); return open.focus(); }
    return self.clients.openWindow(url);
  })());
});
