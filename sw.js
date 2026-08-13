
// sw.js
const CACHE_NAME = "car-maintenance-app-v1";

const CACHE_FILES = [
  "./",
  "./index.html",
  "./app.js",
  "./db.js",
  "./style.css",
  "./manifest.json",
  "./fonts/Vazirmatn-Regular.woff2",
  "./fonts/Vazirmatn-Medium.woff2",
  "./fonts/Vazirmatn-Bold.woff2",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// نصب Service Worker و کش کردن فایل‌های اصلی
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Caching app shell");
        return cache.addAll(CACHE_FILES);
      })
      .then(() => self.skipWaiting()),
  );
});

// فعال‌سازی و حذف کش‌های قدیمی
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log("[SW] Removing old cache:", name);
              return caches.delete(name);
            }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// استراتژی: Cache First با Fallback به شبکه
self.addEventListener("fetch", (event) => {
  // فقط درخواست‌های GET رو مدیریت کن
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          // کپی از پاسخ رو کش کن (برای درخواست‌های جدید هم‌دامنه)
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            event.request.url.startsWith(self.location.origin)
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // اگه آفلاین بود و فایل HTML خواسته شده بود، صفحه اصلی رو برگردون
          if (event.request.headers.get("accept")?.includes("text/html")) {
            return caches.match("./index.html");
          }
        });
    }),
  );
});

// مدیریت نوتیفیکیشن‌های پس‌زمینه (یادآوری سررسید قطعات)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientsArr) => {
      const hadWindow = clientsArr.some((client) => {
        if (
          client.url.includes("index.html") ||
          client.url === self.location.origin + "/"
        ) {
          client.focus();
          return true;
        }
        return false;
      });
      if (!hadWindow) {
        self.clients.openWindow("./index.html");
      }
    }),
  );
});

// دریافت پیام از صفحه اصلی (مثلاً برای تریگر نوتیفیکیشن دستی)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const { title, body, tag } = event.data.payload;
    self.registration.showNotification(title, {
      body: body,
      icon: "./icons/icon-192.png",
      badge: "./icons/icon-192.png",
      tag: tag || "maintenance-reminder",
      dir: "rtl",
      lang: "fa",
    });
  }
});
