/* DM Re:Vault Service Worker
   HTML はネットワーク優先（更新を即反映）、その他アセットはキャッシュ優先。
   更新時は CACHE のバージョン文字列を上げるだけで旧キャッシュを自動破棄します。 */
const CACHE = "dmrevault-v104";
const CORE  = ["./", "./index.html"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE).catch(() => {}))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== location.origin) return;

  const isHTML =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    // ネットワーク優先：常に最新のHTMLを取得。オフライン時はキャッシュへフォールバック。
    e.respondWith((async () => {
      try {
        const net = await fetch(req, { cache: "no-store" });
        const c = await caches.open(CACHE);
        c.put(req, net.clone()).catch(() => {});
        return net;
      } catch (_) {
        return (await caches.match(req)) ||
               (await caches.match("./index.html")) ||
               new Response("offline", { status: 503 });
      }
    })());
    return;
  }

  // その他の同一オリジンGET：キャッシュ優先（初回のみ取得してキャッシュ）
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const net = await fetch(req);
      if (net && net.status === 200) {
        const c = await caches.open(CACHE);
        c.put(req, net.clone()).catch(() => {});
      }
      return net;
    } catch (_) {
      return cached || new Response("", { status: 504 });
    }
  })());
});
