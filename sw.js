// Offline-schil: de site zelf werkt offline (weer ophalen natuurlijk niet).
// Statische assets: cache-first. Pagina's: netwerk eerst, cache als vangnet.
// De publicatiebuild vervangt VERSION door een hash van alle runtimebestanden.
const VERSION = "ishetalafgelast-security-v1";
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

// "reload" slaat de HTTP-cache over (Pages: max-age=600). Anders kan een nieuwe
// worker de JavaScript van de vorige release vastzetten tot de volgende deploy.
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION)
    .then((c) => c.addAll(CORE.map((path) => new Request(path, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION
        && (k.startsWith("ishetalafgelast-") || /^v\d+-\d+$/.test(k))).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  const page = /^\/(?:index\.html|privacy\.html|404\.html)?$/.test(url.pathname)
    || /^\/plaatsen\/(?:[a-z-]+\.html)?$/.test(url.pathname);
  const asset = CORE.includes(url.pathname) || /^\/img\/(?:scenes\/)?[a-z0-9-]+\.(?:webp|png|jpg)$/.test(url.pathname);
  if (!page && !asset) return;

  if (req.mode === "navigate") {
    const response =
      fetch(req)
        .then((res) => {
          if (res.ok && !res.redirected && res.headers.get("Content-Type")?.includes("text/html")) {
            const copy = res.clone();
            e.waitUntil(caches.open(VERSION).then((c) => c.put(url.pathname, copy)).catch(() => {}));
          }
          return res;
        })
        // Offline: deze pagina uit de cache, anders de app zelf in plaats van een browserfout.
        .catch(() => caches.open(VERSION)
          .then((c) => c.match(url.pathname).then((r) => r || c.match("/")))
          .then((r) => r || Response.error()));
    e.respondWith(response);
    e.waitUntil(response.then(() => {}).catch(() => {}));
    return;
  }

  const response = caches.open(VERSION).then((c) => c.match(req)).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && !res.redirected) {
        const copy = res.clone();
        e.waitUntil(caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {}));
      }
      return res;
    }));
  e.respondWith(response);
  e.waitUntil(response.then(() => {}).catch(() => {}));
});
