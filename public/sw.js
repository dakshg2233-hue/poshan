/**
 * Poshan's push-notification service worker. Deliberately does nothing
 * else — no offline caching, no asset interception — this exists only to
 * receive a push event while the app isn't open and turn it into a
 * system notification, then focus/open the app on click.
 */

self.addEventListener("push", (event) => {
  let data = { title: "Poshan", body: "Don't forget to log today's meals.", url: "/dashboard" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* Non-JSON payload — fall back to the defaults above rather than failing silently. */
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.png",
      data: { url: data.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
