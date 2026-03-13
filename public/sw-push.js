// Service worker for push notifications and background alarms

self.addEventListener("push", (event) => {
  console.log("[SW] Push received:", event);

  let data = { title: "Tasks To-Do", body: "You have a notification" };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    tag: data.tag || `task-${Date.now()}`,
    renotify: true,
    data: {
      dateOfArrival: Date.now(),
      url: data.url || "/dashboard",
      taskId: data.taskId || null,
      repeatAlarm: data.repeatAlarm || false,
    },
    actions: [
      { action: "complete", title: "✅ Mark Done" },
      { action: "snooze", title: "⏰ Snooze 10m" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event);
  event.notification.close();

  const url = event.notification.data?.url || "/dashboard";

  if (event.action === "dismiss") {
    return;
  }

  if (event.action === "snooze") {
    // Re-show notification after 10 minutes
    const data = event.notification;
    event.waitUntil(
      new Promise((resolve) => {
        setTimeout(() => {
          self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon,
            badge: "/pwa-192x192.png",
            vibrate: [200, 100, 200, 100, 200],
            requireInteraction: true,
            tag: `task-snoozed-${Date.now()}`,
            renotify: true,
            data: data.data,
            actions: [
              { action: "complete", title: "✅ Mark Done" },
              { action: "snooze", title: "⏰ Snooze 10m" },
              { action: "dismiss", title: "Dismiss" },
            ],
          }).then(resolve);
        }, 10 * 60 * 1000);
      })
    );
    return;
  }

  // "complete" or default click — open the app
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
