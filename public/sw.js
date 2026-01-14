const CACHE_NAME = 'attendance-app-v1';
const urlsToCache = [
  '/link-up/',
  '/link-up/static/js/bundle.js',
  '/link-up/static/css/main.css',
  '/link-up/manifest.json',
  '/link-up/logo192.png',
  '/link-up/logo512.png'
];

// インストール時の処理
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // インストール完了後、すぐにアクティベート
        return self.skipWaiting();
      })
  );
});

// フェッチ時の処理（オフライン対応）
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // キャッシュに存在する場合はキャッシュを返す
        if (response) {
          return response;
        }
        
        // ネットワークリクエストを試行
        return fetch(event.request)
          .then((response) => {
            // レスポンスが有効でない場合はそのまま返す
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // レスポンスをクローンしてキャッシュに保存
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // オフライン時のフォールバック
            if (event.request.destination === 'document') {
              return caches.match('/link-up/');
            }
          });
      })
  );
});

// アクティベート時の処理
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // すべてのクライアントを制御下に置く
      return self.clients.claim();
    })
  );
});

// プッシュ通知の処理
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : '出欠登録のお知らせ',
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'アプリを開く',
        icon: '/logo192.png'
      },
      {
        action: 'close',
        title: '閉じる',
        icon: '/logo192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('出欠管理システム', options)
  );
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/link-up/')
    );
  }
});
