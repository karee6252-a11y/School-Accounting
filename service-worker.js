// ============================================================
//  Service Worker — نظام المحاسبة المدرسي
//  الإصدار: يُحدَّث تلقائياً عند تغيير أي ملف
// ============================================================

const CACHE_NAME = 'mohasba-v34';

// الملفات اللي هتتحفظ في الـ cache لأول مرة (App Shell)
const APP_SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/layout.js',
  '/firebase-config.js',
  '/pwa.js',
  '/manifest.json',

  // صفحات التطبيق
  '/dashboard.html',
  '/collection.html',
  '/uniform.html',
  '/student-search.html',
  '/debts.html',
  '/expenses.html',
  '/buses.html',
  '/contractors.html',
  '/reports.html',
  '/analytics.html',
  '/party.html',
  '/photo-package.html',
  '/edit-student.html',
  '/student-affairs.html',
  '/hr.html',
  '/admin.html',
  '/ACCOUNTS.html',
  '/ticket.html',

  // أيقونات
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512-maskable.png',
  '/icons/apple-touch-icon.png',
  '/bristol-receipt-logo.jpeg',
];

// مصادر خارجية تتحفظ في cache منفصل
const EXTERNAL_CACHE = 'mohasba-external-v1';
const EXTERNAL_URLS = [
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap',
  'https://fonts.gstatic.com',
];

// ============================================================
//  Install — حفظ App Shell في الـ cache
// ============================================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // نحاول نحفظ كل ملف بشكل مستقل
      // عشان لو ملف مش موجود متعطلش الباقي
      return Promise.allSettled(
        APP_SHELL.map(url =>
          cache.add(url).catch(() => {
            console.warn('[SW] فشل تحميل:', url);
          })
        )
      );
    }).then(() => {
      console.log('[SW] App Shell محفوظ');
      return self.skipWaiting(); // تفعيل الـ SW فوراً
    })
  );
});

// ============================================================
//  Activate — حذف الـ caches القديمة
// ============================================================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== EXTERNAL_CACHE)
          .map(key => {
            console.log('[SW] حذف cache قديم:', key);
            return caches.delete(key);
          })
      );
    }).then(() => {
      console.log('[SW] Service Worker نشط');
      return self.clients.claim(); // تحكم في كل التابات المفتوحة
    })
  );
});

// ============================================================
//  Fetch — استراتيجية الـ Cache
// ============================================================
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Firebase & APIs — دايماً من الشبكة (لا cache أبداً)
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('googleapis.com') ||
    request.method !== 'GET'
  ) {
    return; // يمشي للشبكة عادي
  }

  // 2. Firebase JS SDK من gstatic — Cache First
  if (url.hostname === 'www.gstatic.com') {
    event.respondWith(cacheFirst(request, EXTERNAL_CACHE));
    return;
  }

  // 3. Google Fonts — Cache First
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(cacheFirst(request, EXTERNAL_CACHE));
    return;
  }

  // 4. CDN (ExcelJS, إلخ) — Cache First
  if (
    url.hostname.includes('cdnjs.cloudflare.com') ||
    url.hostname.includes('cdn.jsdelivr.net') ||
    url.hostname.includes('unpkg.com')
  ) {
    event.respondWith(cacheFirst(request, EXTERNAL_CACHE));
    return;
  }

  // 5. ملفات التطبيق (HTML, CSS, JS) — Network First مع Fallback
  // يجرب الشبكة أولاً عشان يجيب أحدث نسخة،
  // لو مفيش نت يرجع من الـ cache
  event.respondWith(networkFirstWithFallback(request));
});

// ============================================================
//  استراتيجية: Cache First
//  مناسبة للـ assets الثابتة (fonts, CDN)
// ============================================================
async function matchCache(request, cacheName) {
  // تجاهل ?v= عشان /pwa.js?v=7 يلاقي /pwa.js المتخزّن
  const exact = await caches.match(request, cacheName ? { cacheName } : undefined);
  if (exact) return exact;
  return caches.match(request, {
    ignoreSearch: true,
    ...(cacheName ? { cacheName } : {}),
  });
}

async function cacheFirst(request, cacheName = CACHE_NAME) {
  const cached = await matchCache(request, cacheName);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      // خزّن بالنسخة بدون query عشان المطابقة تبقى أسهل
      const url = new URL(request.url);
      url.search = '';
      cache.put(url.origin + url.pathname, response.clone()).catch(() => {
        cache.put(request, response.clone());
      });
    }
    return response;
  } catch {
    return new Response('', { status: 408, statusText: 'Offline' });
  }
}

// ============================================================
//  استراتيجية: Network First with Cache Fallback
//  مناسبة لصفحات HTML و CSS و JS الخاصة بالتطبيق
// ============================================================
async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      // حدّث الـ cache بأحدث نسخة (بالمسار بدون query أيضاً)
      const cache = await caches.open(CACHE_NAME);
      const url = new URL(request.url);
      url.search = '';
      try {
        await cache.put(url.origin + url.pathname, response.clone());
      } catch (_) {
        await cache.put(request, response.clone());
      }
    }
    return response;
  } catch {
    // الشبكة مش شغالة — رجّع من الـ cache (مع تجاهل ?v=)
    const cached = await matchCache(request);
    if (cached) return cached;

    return new Response(
      `<!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>غير متصل بالإنترنت</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Cairo', Arial, sans-serif;
            background: #f0f4ff;
            display: flex; align-items: center; justify-content: center;
            min-height: 100vh; padding: 2rem;
            direction: rtl;
          }
          .card {
            background: white; border-radius: 16px;
            padding: 3rem 2rem; text-align: center;
            max-width: 400px; width: 100%;
            box-shadow: 0 8px 32px rgba(26,58,107,0.12);
          }
          .icon { font-size: 4rem; margin-bottom: 1rem; }
          h1 { color: #1a3a6b; font-size: 1.4rem; margin-bottom: 0.5rem; }
          p  { color: #666; font-size: 0.9rem; line-height: 1.6; margin-bottom: 1.5rem; }
          button {
            background: #1a3a6b; color: white; border: none;
            padding: 0.75rem 2rem; border-radius: 8px;
            font-family: inherit; font-size: 0.9rem; font-weight: 700;
            cursor: pointer;
          }
          button:hover { background: #0d2247; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">📶</div>
          <h1>غير متصل بالإنترنت</h1>
          <p>تأكد من اتصالك بالإنترنت وحاول مرة أخرى.<br>الصفحات المحفوظة مسبقاً ستظل تعمل.</p>
          <button onclick="location.reload()">🔄 إعادة المحاولة</button>
        </div>
      </body>
      </html>`,
      {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }
    );
  }
}

// ============================================================
//  Web Push — إشعارات الأدمن
// ============================================================
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: 'School System', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'School System';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/admin.html' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const raw = (event.notification.data && event.notification.data.url) || '/admin.html';
  const target = new URL(raw, self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (list) => {
      for (const client of list) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            try { await client.navigate(target); return; } catch (_) { /* fall through */ }
          }
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(target);
    })
  );
});

// ============================================================
//  رسائل من الصفحة للـ Service Worker
// ============================================================
self.addEventListener('message', event => {
  // تحديث إجباري (لما المستخدم يضغط "تحديث")
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // مسح الـ cache يدوياً
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
    event.ports[0]?.postMessage({ success: true });
  }
});
