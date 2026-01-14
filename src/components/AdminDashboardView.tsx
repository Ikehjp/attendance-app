import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { organizationApi, groupApi } from '../api';
import useAuthStore from '../stores/authStore';
import './AdminDashboardView.css';

interface DashboardStats {
  totalGroups: number;
  totalStudents: number;
  totalTeachers: number;
  todayAttendanceRate: number;
}

interface Group {
  id: number;
  name: string;
  is_active: boolean;
  grade?: string;
  academic_year?: string;
  member_count?: number;
}

interface Organization {
  id: number;
  name: string;
  student_join_code?: string;
}

/**
 * 管理者ダッシュボードビュー
 */
const AdminDashboardView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const orgId = user?.organization_id || 1;

      // 組織情報、統計、グループ一覧を並行取得
      const [orgResponse, statsResponse, groupsResponse] = await Promise.all([
        organizationApi.getOrganization(orgId),
        organizationApi.getOrganizationStats(orgId),
        groupApi.getGroups(),
      ]);

      if (orgResponse.success) {
        setOrganization(orgResponse.data);
      }

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }

      if (groupsResponse.success) {
        setGroups(groupsResponse.data.groups || []);
      }
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError(err.message || 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard-loading">
        <div className="spinner" />
        <p>読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard-error">
        <p className="error-message">⚠️ {error}</p>
        <button onClick={fetchDashboardData} className="btn btn--primary">
          再読み込み
        </button>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>管理者ダッシュボード</h1>
        <p className="dashboard-subtitle">システム全体の統計と管理</p>
      </div>

      {/* 統計カード */}
      <div className="stats-grid">
        <div className="stat-card stat-card--primary">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3 className="stat-value">{stats?.totalGroups || 0}</h3>
            <p className="stat-label">グループ数</p>
          </div>
        </div>

        <div className="stat-card stat-card--success">
          <div className="stat-icon">🎓</div>
          <div className="stat-content">
            <h3 className="stat-value">{stats?.totalStudents || 0}</h3>
            <p className="stat-label">学生数</p>
          </div>
        </div>

        <div className="stat-card stat-card--info">
          <div className="stat-icon">👨‍🏫</div>
          <div className="stat-content">
            <h3 className="stat-value">{stats?.totalTeachers || 0}</h3>
            <p className="stat-label">教員数</p>
          </div>
        </div>

        <div className="stat-card stat-card--warning">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3 className="stat-value">
              {stats?.todayAttendanceRate
                ? `${stats.todayAttendanceRate}%`
                : 'N/A'}
            </h3>
            <p className="stat-label">今日の出席率</p>
          </div>
        </div>
      </div>

      {/* 組織管理セクション */}
      {organization && (user?.role === 'owner' || user?.role === 'admin') && (
        <div className="dashboard-section organization-section">
          <div className="section-header">
            <h2>🏢 組織管理</h2>
          </div>
          <div className="organization-info-card">
            <div className="org-info-row">
              <span className="org-label">組織名</span>
              <span className="org-value">{organization.name}</span>
            </div>
            <div className="org-info-row">
              <span className="org-label">組織ID</span>
              <span className="org-value">#{organization.id}</span>
            </div>
            <div className="org-info-row join-code-row">
              <span className="org-label">📋 生徒用参加コード</span>
              <div className="join-code-container">
                <code className="join-code">
                  {organization.student_join_code || '未設定'}
                </code>
                {organization.student_join_code && (
                  <button
                    className="copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(organization.student_join_code);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? '✓ コピー済み' : 'コピー'}
                  </button>
                )}
              </div>
            </div>
            <p className="join-code-hint">
              このコードを生徒に共有すると、生徒は新規登録時にこのコードで組織に参加できます。
            </p>
          </div>
        </div>
      )}

      {/* グループ一覧 */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>グループ一覧</h2>
          <button className="btn btn--primary" onClick={() => navigate('/groups')}>
            + 新規グループ
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="empty-state">
            <p>グループがまだありません</p>
            <button className="btn btn--secondary" onClick={() => navigate('/groups')}>最初のグループを作成</button>
          </div>
        ) : (
          <div className="groups-grid">
            {groups.map(group => (
              <div key={group.id} className="group-card">
                <div className="group-header">
                  <h3>{group.name}</h3>
                  <span className={`group-status ${group.is_active ? 'active' : 'inactive'}`}>
                    {group.is_active ? 'アクティブ' : '非アクティブ'}
                  </span>
                </div>
                <div className="group-info">
                  <p className="group-detail">
                    <span className="label">学年:</span>
                    <span className="value">{group.grade || 'N/A'}</span>
                  </p>
                  <p className="group-detail">
                    <span className="label">年度:</span>
                    <span className="value">{group.academic_year || 'N/A'}</span>
                  </p>
                  <p className="group-detail">
                    <span className="label">メンバー数:</span>
                    <span className="value">{group.member_count || 0}名</span>
                  </p>
                </div>
                <div className="group-actions">
                  <button className="btn btn--sm btn--secondary" onClick={() => navigate('/groups')}>詳細</button>
                  <button className="btn btn--sm btn--primary" onClick={() => navigate('/groups')}>編集</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* クイックアクション */}
      <div className="dashboard-section">
        <h2>クイックアクション</h2>
        <div className="quick-actions">
          <button className="action-btn" onClick={() => navigate('/qr-generator')}>
            <span className="action-icon">📱</span>
            <span className="action-text">QRコード生成</span>
          </button>
          <button className="action-btn" onClick={() => navigate('/timetable')}>
            <span className="action-icon">📅</span>
            <span className="action-text">時間割管理</span>
          </button>
          <button className="action-btn" onClick={() => navigate('/events')}>
            <span className="action-icon">📆</span>
            <span className="action-text">イベント管理</span>
          </button>
          <button className="action-btn" onClick={() => alert('IP範囲設定機能は開発中です')}>
            <span className="action-icon">🔒</span>
            <span className="action-text">IP範囲設定</span>
          </button>
          <button className="action-btn" onClick={() => navigate('/approvals')}>
            <span className="action-icon">📊</span>
            <span className="action-text">承認管理</span>
          </button>
        </div>
      </div>

    </div>
  );
};

export default AdminDashboardView;
