// Service Worker — L'Oiseau Blanc Push Notifications

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "L'Oiseau Blanc", body: event.data.text() };
  }

  const options = {
    body: data.body ?? '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: data.tag ?? 'oiseau-blanc',
    renotify: true,
    data: { url: data.url ?? '/' },
    actions: data.actions ?? [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title ?? "L'Oiseau Blanc", options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
