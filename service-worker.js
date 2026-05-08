/*
  Yo-Ki-Hi service worker
  - cache-first for static assets, network-first for HTML
  - 認証ページはキャッシュさせない
*/

const VERSION = "yokihi-v20260508t";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/assets/favicon.svg",
  "/assets/og-image.jpg",
  "/assets/belt-check-guide.webp",
  "/assets/belt-position-guide.webp",
  "/assets/ems-overview.png",
  "/assets/inspection-overview.png",
  "/assets/ems-supine.jpg",
  "/assets/ems-pads.jpg",
  "/assets/hero-belt.jpg",
  "/assets/hero-inner.jpg",
  "/assets/size-chart.jpg",
];

const NEVER_CACHE = [
  "/purchase-login.html",
  "/purchase-shop.html",
  "/purchase-hiramori.html",
  "/purchase-ota.html",
  "/purchase-login.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (NEVER_CACHE.some((p) => url.pathname === p)) {
    event.respondWith(fetch(req));
    return;
  }

  // HTML: network-first（最新優先、オフライン時はキャッシュ）
  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match("/index.html")))
    );
    return;
  }

  // assets: cache-first
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(req, copy));
      return res;
    }))
  );
});
