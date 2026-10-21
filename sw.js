// Offline-schil: de site zelf werkt offline (weer ophalen natuurlijk niet).
// Statische assets: cache-first. Pagina's: netwerk eerst, cache als vangnet.
// Verhoog VERSION bij elke release die assets wijzigt.
const VERSION = "v5-2";
const CORE = [
  "/",
  "/styles.css",
  "/js/app.js",
  "/js/engine.js",
  "/js/model.js",
  "/js/scene.js",
  "/js/stuitproef.js",
  "/js/eggs.js",
  "/fonts/lilita-one.woff2",
  "/fonts/fredoka.woff2",
  "/fonts/patrick-hand.woff2",
  "/img/logo.webp",
  "/img/scroll.webp",
  "/img/scenes/kantine-d.webp",
  "/img/scenes/kantine-m.webp",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(url.pathname, copy));
          return res;
        })
        .catch(() => caches.match(url.pathname).then((r) => r || caches.match("/"))),
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
      }
      return res;
    })),
  );
});
