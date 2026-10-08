const CACHE_NAME = "xoot-static-v7";
const OFFLINE_URL = "/offline.html";
const STATIC_ASSETS = ["/manifest.json", "/manifest.webmanifest", "/zoot-icon.svg", "/favicon.ico", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png", "/fonts/plus-jakarta-sans-latin-var.woff2", "/fonts/newsreader-latin-var.woff2", "/fonts/caveat-latin-var.woff2", OFFLINE_URL];
const SENSITIVE_NOTIFICATION_PATTERNS = [
  /\b(gate|alarm|lockbox|pin|code|access note|access notes|id number|passport|bank|card|payment ref|complaint)\b/i,
  /\b\d{4,}\b/,
];

const safeNotificationText = (value, fallback) => {
  const text = typeof value === "string" ? value.trim().slice(0, 140) : "";
  if (!text || SENSITIVE_NOTIFICATION_PATTERNS.some((pattern) => pattern.test(text))) return fallback;
  return text;
};

const safeNotificationUrl = (value) => {
  try {
    const url = new URL(typeof value === "string" ? value : "/app", self.location.origin);
    if (url.origin !== self.location.origin) return "/app";
    return url.pathname.startsWith("/app") ? `${url.pathname}${url.search}` : "/app";
  } catch {
    return "/app";
  }
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => /^(xoot|zoot)-static-/.test(key) && key !== CACHE_NAME).map((key) => caches.delete(key))))
      // Claim future requests without discarding an in-progress booking or sign-in form.
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { title: "Xoot update", body: event.data?.text() };
  }
  const title = safeNotificationText(payload.title, "Xoot booking update");
  const options = {
    body: safeNotificationText(payload.body, "Open Xoot for the latest booking update."),
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: safeNotificationUrl(payload.url) },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/app", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url === targetUrl || client.url.endsWith(new URL(targetUrl).pathname));
      if (existing) return existing.focus();
      return self.clients.openWindow(targetUrl);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }

  if (url.pathname.startsWith("/assets/") || STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)));
          }
          return response;
        })
        .catch(() => caches.match(event.request)),
    );
  }
});
