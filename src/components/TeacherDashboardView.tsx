import React, { useState, useEffect } from 'react';
import { groupApi, absenceRequestApi } from '../api';
import useAuthStore from '../stores/authStore';
import QRManagement from './admin/QRManagement';
import './TeacherDashboardView.css';

interface TeacherGroup {
  id: number;
  name: string;
  teacher_role: 'main' | 'assistant';
  grade?: string;
  member_count?: number;
  attendance_rate?: number;
}

interface PendingRequest {
  id: number;
  student_name: string;
  request_type: string;
  request_date: string;
  reason: string;
}

interface ClassItem {
  startTime: string;
  subject: string;
  room: string;
}

/**
 * 教員ダッシュボードビュー
 */
const TeacherDashboardView: React.FC = () => {
  const user = useAuthStore(state => state.user);
  const [myGroups, setMyGroups] = useState<TeacherGroup[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [todayClasses, setTodayClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showQRManagement, setShowQRManagement] = useState<boolean>(false);

  const fetchTeacherData = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 担当グループと承認待ち申請を取得
      const [groupsResponse, requestsResponse] = await Promise.all([
        groupApi.getGroups({ teacherId: user?.id }),
        absenceRequestApi.getPendingRequestsForTeacher(user?.id),
      ]);

      if (groupsResponse.success) {
        setMyGroups(groupsResponse.data);
      }

      if (requestsResponse.success) {
        setPendingRequests(requestsResponse.data);
      }

      // TODO: 今日の授業一覧取得（時間割APIから）
      setTodayClasses([]);

    } catch (err) {
      console.error('Teacher data fetch error:', err);
      setError(err.message || 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTeacherData();
  }, [fetchTeacherData]);

  if (loading) {
    return (
      <div className="teacher-dashboard-loading">
        <div className="spinner" />
        <p>読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="teacher-dashboard-error">
        <p className="error-message">⚠️ {error}</p>
        <button onClick={fetchTeacherData} className="btn btn--primary">
          再読み込み
        </button>
      </div>
    );
  }

  return (
    <div className="teacher-dashboard">
      <div className="dashboard-header">
        <h1>教員ダッシュボード</h1>
        <p className="dashboard-subtitle">
          ようこそ、{user?.name || '先生'}
        </p>
      </div>

      {/* 統計カード */}
      <div className="stats-grid">
        <div className="stat-card stat-card--primary">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3 className="stat-value">{myGroups.length}</h3>
            <p className="stat-label">担当クラス</p>
          </div>
        </div>

        <div className="stat-card stat-card--warning">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <h3 className="stat-value">{pendingRequests.length}</h3>
            <p className="stat-label">承認待ち申請</p>
          </div>
        </div>

        <div className="stat-card stat-card--info">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <h3 className="stat-value">{todayClasses.length}</h3>
            <p className="stat-label">今日の授業</p>
          </div>

          {/* クイックアクション (教員用) */}
          <div className="dashboard-section">
            <div className="quick-actions" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button className="btn btn--primary" onClick={() => setShowQRManagement(true)}>
                📱 QRコード生成
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 承認待ち申請 */}
      {pendingRequests.length > 0 && (
        <div className="dashboard-section">
          <div className="section-header">
            <h2>承認待ち申請</h2>
            <button className="btn btn--link">すべて表示 →</button>
          </div>

          <div className="requests-list">
            {pendingRequests.slice(0, 5).map(request => (
              <div key={request.id} className="request-item">
                <div className="request-info">
                  <h4 className="request-student">{request.student_name}</h4>
                  <p className="request-detail">
                    <span className="request-type">{getRequestTypeLabel(request.request_type)}</span>
                    <span className="request-date">{formatDate(request.request_date)}</span>
                  </p>
                  <p className="request-reason">{request.reason}</p>
                </div>
                <div className="request-actions">
                  <button className="btn btn--sm btn--success">承認</button>
                  <button className="btn btn--sm btn--danger">却下</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 担当クラス */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>担当クラス</h2>
        </div>

        {myGroups.length === 0 ? (
          <div className="empty-state">
            <p>担当クラスはまだありません</p>
          </div>
        ) : (
          <div className="groups-grid">
            {myGroups.map(group => (
              <div key={group.id} className="group-card">
                <div className="group-header">
                  <h3>{group.name}</h3>
                  <span className="group-role">{group.teacher_role === 'main' ? '主担当' : '副担当'}</span>
                </div>
                <div className="group-info">
                  <p className="group-detail">
                    <span className="label">学年:</span>
                    <span className="value">{group.grade || 'N/A'}</span>
                  </p>
                  <p className="group-detail">
                    <span className="label">メンバー数:</span>
                    <span className="value">{group.member_count || 0}名</span>
                  </p>
                  <p className="group-detail">
                    <span className="label">出席率:</span>
                    <span className="value attendance-rate">
                      {group.attendance_rate ? `${group.attendance_rate}%` : 'N/A'}
                    </span>
                  </p>
                </div>
                <div className="group-actions">
                  <button className="btn btn--sm btn--primary">詳細</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 今日の授業 */}
      <div className="dashboard-section">
        <h2>今日の授業</h2>
        {todayClasses.length === 0 ? (
          <div className="empty-state">
            <p>今日の授業はありません</p>
          </div>
        ) : (
          <div className="classes-timeline">
            {todayClasses.map((classItem, index) => (
              <div key={index} className="class-item">
                <div className="class-time">{classItem.startTime}</div>
                <div className="class-info">
                  <h4>{classItem.subject}</h4>
                  <p>{classItem.room}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR管理モーダル */}
      {showQRManagement && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', width: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
              <button onClick={() => setShowQRManagement(false)} className="btn btn--sm btn--secondary">閉じる</button>
            </div>
            <QRManagement />
          </div>
        </div>
      )}
    </div>
  );
};

// ヘルパー関数
const getRequestTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    'absence': '欠席届',
    'official_absence': '公欠届',
    'official_late': '公遅刻届',
    'early_departure': '早退届',
  };
  return labels[type] || type;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export default TeacherDashboardView;
