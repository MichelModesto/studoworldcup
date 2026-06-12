/* Service worker do StudoWorldCup: instalabilidade (PWA) + push de lembretes. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Passthrough: rede sempre (os dados são ao vivo; sem cache offline por ora).
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    /* payload não-JSON */
  }
  const titulo = dados.titulo || "⚽ StudoWorldCup";
  const opcoes = {
    body: dados.corpo || "Tem jogo hoje no bolão!",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: dados.url || "/painel/bolao/palpites" },
  };
  event.waitUntil(self.registration.showNotification(titulo, opcoes));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/painel/bolao/palpites";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const c of lista) {
        if ("focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
