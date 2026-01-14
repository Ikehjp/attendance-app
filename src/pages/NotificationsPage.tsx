import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi, absenceRequestApi } from '../api';
import useAuthStore from '../stores/authStore';
import './NotificationsPage.css';

interface Notification {
  id: number;
  type: 'approval' | 'rejection' | 'info' | 'warning' | 'setting' | string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  [key: string]: any;
}

/**
 * お知らせページ
 * 組織設定変更、承認・却下などの通知を一覧表示
 */
const NotificationsPage: React.FC = () => {
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const fetchNotifications = useCallback(async() => {
    setLoading(true);
    try {
      const response = await notificationApi.getNotifications({ limit: 50 });
      if (response.success) {
        setNotifications((response.data as any)?.notifications || []);
      }
    } catch (err: any) {
      console.error('通知取得エラー:', err);
      setError('通知の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  // 管理者/教師向け: 承認待ち件数を取得
  const fetchPendingCount = useCallback(async() => {
    if (!user || user.role === 'student') return;

    try {
      const response = await absenceRequestApi.getAllRequests({ status: 'pending' });
      if (response.success) {
        const requests = (response.data as any[]) || [];
        setPendingCount(requests.length);
      }
    } catch (err) {
      console.error('承認待ち件数取得エラー:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchPendingCount();
    }
  }, [user, fetchNotifications, fetchPendingCount]);

  const handleMarkAsRead = async(notificationId: number) => {
    try {
      await notificationApi.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n),
      );
    } catch (err) {
      console.error('既読更新エラー:', err);
    }
  };

  const handleMarkAllAsRead = async() => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('全既読更新エラー:', err);
    }
  };

  // 通知を削除
  const handleDelete = async(e: React.MouseEvent, notificationId: number) => {
    e.stopPropagation(); // カードのクリックイベントを止める
    try {
      await notificationApi.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('通知削除エラー:', err);
    }
  };

  // 通知をクリックしたときのハンドラ
  const handleNotificationClick = async(notification: Notification) => {
    // 未読なら既読に
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }

    // 通知タイプに応じてナビゲート
    switch (notification.type) {
      case 'approval':
      case 'rejection':
        // 学生ならカレンダーページへ、管理者/教師なら承認管理ページへ
        if (user?.role === 'student') {
          navigate('/calendar');
        } else {
          navigate('/approvals');
        }
        break;
      case 'setting':
        navigate('/timetable');
        break;
      default:
        // その他の通知は特にナビゲートしない
        break;
    }
  };

  // 通知タイプに応じたリンクラベルを取得
  const getLinkLabel = (type: string) => {
    switch (type) {
      case 'approval':
      case 'rejection':
        return user?.role === 'student' ? 'カレンダーを見る →' : '承認管理へ →';
      case 'setting':
        return '設定を確認 →';
      default:
        return null;
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'approval':
        return '✅';
      case 'rejection':
        return '❌';
      case 'info':
        return 'ℹ️';
      case 'warning':
        return '⚠️';
      case 'setting':
        return '⚙️';
      default:
        return '📢';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'approval':
        return '承認';
      case 'rejection':
        return '却下';
      case 'info':
        return 'お知らせ';
      case 'warning':
        return '警告';
      case 'setting':
        return '設定変更';
      default:
        return 'その他';
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="notifications-page">
      <div className="notifications-container">
        <div className="notifications-header">
          <div className="header-left">
            <h1>📬 お知らせ</h1>
            {unreadCount > 0 && (
              <span className="unread-badge">{unreadCount}件の未読</span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              className="btn btn--secondary"
              onClick={handleMarkAllAsRead}
            >
              すべて既読にする
            </button>
          )}
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {/* 管理者/教師向けサマリーカード */}
        {user?.role !== 'student' && (
          <div className="summary-cards">
            {pendingCount > 0 && (
              <div
                className="summary-card pending-card"
                onClick={() => navigate('/approvals')}
              >
                <div className="summary-icon">📋</div>
                <div className="summary-content">
                  <span className="summary-count">{pendingCount}</span>
                  <span className="summary-label">件の承認待ち申請</span>
                </div>
                <span className="summary-action">確認する →</span>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>読み込み中...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>お知らせはありません</h3>
            <p>新しい通知が届くとここに表示されます</p>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`notification-card ${!notification.is_read ? 'unread' : ''} ${getLinkLabel(notification.type) ? 'clickable' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-icon">
                  {getTypeIcon(notification.type)}
                </div>
                <div className="notification-content">
                  <div className="notification-header">
                    <span className={`notification-type type-${notification.type}`}>
                      {getTypeLabel(notification.type)}
                    </span>
                    <span className="notification-time">
                      {formatDateTime(notification.created_at)}
                    </span>
                  </div>
                  <h3 className="notification-title">{notification.title}</h3>
                  <p className="notification-message">{notification.message}</p>
                  {getLinkLabel(notification.type) && (
                    <span className="notification-link">
                      {getLinkLabel(notification.type)}
                    </span>
                  )}
                </div>
                {notification.is_read ? (
                  <button
                    className="notification-delete-btn"
                    onClick={(e) => handleDelete(e, notification.id)}
                    title="削除"
                  >
                    ✕
                  </button>
                ) : (
                  <div className="unread-indicator" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;

