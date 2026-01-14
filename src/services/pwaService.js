// PWA（Progressive Web App）関連のサービス

/**
 * Service Workerを登録する
 */
export const registerServiceWorker = async (config) => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.register('/sw.js');

    // 更新の確認
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // 新しいバージョンが利用可能
            if (config && config.onUpdate) {
              config.onUpdate(registration);
            }
          }
        });
      }
    });

    return registration;
  } else {
    return null;
  }
};

/**
 * Service Workerを解除する
 */
export const unregister = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.unregister();
    } catch (error) {
      // Error handled silently
    }
  }
};

/**
 * PWAのインストールプロンプトを管理する
 */
export class PWAInstallManager {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.init();
  }

  init() {
    // インストールプロンプトのイベントをキャッチ
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });

    // アプリがインストールされたかチェック
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.hideInstallButton();
    });

    // スタンドアロンモードかチェック
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
    }
  }

  showInstallButton() {
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
      installButton.style.display = 'block';
    }
  }

  hideInstallButton() {
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
      installButton.style.display = 'none';
    }
  }

  async install() {
    if (!this.deferredPrompt) {
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;

      this.deferredPrompt = null;
      this.hideInstallButton();
      return outcome === 'accepted';
    } catch (error) {
      return false;
    }
  }
}

/**
 * オフライン状態を検知する
 */
export class OfflineManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.init();
  }

  init() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.showOnlineMessage();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.showOfflineMessage();
    });
  }

  showOnlineMessage() {
    this.showNotification('インターネット接続が復旧しました', 'success');
  }

  showOfflineMessage() {
    this.showNotification('オフラインです。一部機能が制限されます。', 'warning');
  }

  showNotification(message, type = 'info') {
    // 通知を表示するロジック
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

/**
 * プッシュ通知を管理する
 */
export class NotificationManager {
  constructor() {
    this.permission = Notification.permission;
  }

  async requestPermission() {
    if (!('Notification' in window)) {
      console.log('このブラウザは通知をサポートしていません');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission === 'denied') {
      console.log('通知が拒否されています');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('通知許可リクエストエラー:', error);
      return false;
    }
  }

  showNotification(title, options = {}) {
    if (this.permission !== 'granted') {
      console.log('通知の許可がありません');
      return null;
    }

    const defaultOptions = {
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: 'attendance-notification',
      requireInteraction: false,
      ...options,
    };

    try {
      const notification = new Notification(title, defaultOptions);

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error('通知表示エラー:', error);
      return null;
    }
  }

  showAttendanceReminder() {
    return this.showNotification('出勤時間です', {
      body: '出勤記録をお忘れなく！',
      icon: '/logo192.png',
    });
  }
}

/**
 * バックグラウンド同期を管理する
 */
export class BackgroundSyncManager {
  constructor() {
    this.isSupported = 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype;
  }

  async registerSync(tag, data = {}) {
    if (!this.isSupported) {
      console.log('バックグラウンド同期はサポートされていません');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(tag);

      // データをIndexedDBに保存
      await this.saveSyncData(tag, data);

      console.log(`バックグラウンド同期を登録しました: ${tag}`);
      return true;
    } catch (error) {
      console.error('バックグラウンド同期登録エラー:', error);
      return false;
    }
  }

  async saveSyncData(tag, data) {
    // IndexedDBにデータを保存するロジック
    // 実装は必要に応じて追加
    console.log(`同期データを保存: ${tag}`, data);
  }
}

// シングルトンインスタンス
export const pwaInstallManager = new PWAInstallManager();
export const offlineManager = new OfflineManager();
export const notificationManager = new NotificationManager();
export const backgroundSyncManager = new BackgroundSyncManager();
