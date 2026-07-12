// ────────────────────────────────────────────────────────────────────────────
// Florence Academy service worker - the offline shell for learners on unreliable
// connections (Manila jeepney wifi is a persona, not an edge case).
//
// Strategy, deliberately boring:
//   - hashed build assets (/assets/*): cache-first (immutable by name)
//   - the app shell + icons: stale-while-revalidate
//   - API (/v1/*), other origins, non-GET: network only, never cached
//
// Bump VERSION on breaking cache-shape changes; activate cleans old caches.
// ────────────────────────────────────────────────────────────────────────────

const VERSION = "fa-v1";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // fonts/CDNs: browser cache
  if (url.pathname.startsWith("/v1/")) return; // API is always live

  // Immutable hashed assets: cache-first.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // Shell + everything else same-origin: stale-while-revalidate with an
  // offline fallback to the cached shell for navigations.
  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const hit = await cache.match(req);
      const refresh = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => undefined);
      if (hit) {
        void refresh;
        return hit;
      }
      const res = await refresh;
      if (res) return res;
      if (req.mode === "navigate") {
        const shell = await cache.match("/index.html");
        if (shell) return shell;
      }
      return Response.error();
    }),
  );
});
