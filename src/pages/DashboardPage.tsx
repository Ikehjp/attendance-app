import React, { useState, useEffect, useMemo, useCallback } from 'react';
import useAuthStore, { User } from '../stores/authStore';
import { attendanceApi } from '../api/attendanceApi';
import { organizationApi } from '../api';
import Button from '../components/common/Button';
import CalendarPage from './CalendarPage';
import AdminDashboardView from '../components/AdminDashboardView';
import TeacherDashboardView from '../components/TeacherDashboardView';
import QRManagement from '../components/admin/QRManagement';
import './DashboardPage.css';

// 出欠ステータス型
type AttendanceStatus = 'present' | 'absent' | 'late' | 'early_departure' | 'break';

// 出欠レコード型
interface AttendanceRecord {
  id: number;
  user_id: number;
  status: AttendanceStatus;
  check_in_time: string | null;
  check_out_time: string | null;
  date: string;
}

// 統計データ型
interface AttendanceStats {
  presentDays: number;
  lateDays: number;
  absentDays: number;
  earlyDepartureDays: number;
  totalHours?: number;
}

// ダッシュボードデータ型
interface AttendanceData {
  todayStatus: AttendanceRecord | null;
  weeklyStats: AttendanceStats | null;
  monthlyStats: AttendanceStats | null;
  annualStats: AttendanceStats | null;
}

// EmployeeDashboard Props
interface EmployeeDashboardProps {
  user: User;
}

// APIレスポンス型
interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

/**
 * ロール別ダッシュボードページ
 * - admin: AdminDashboardView
 * - teacher: TeacherDashboardView
 * - employee/student: 従来の従業員ダッシュボード
 */
const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();

  // ロールに応じたビューを表示
  if (!user) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <div className="spinner" />
          <p>ユーザー情報を読み込んでいます...</p>
        </div>
      </div>
    );
  }

  // 管理者・オーナーダッシュボード
  if (user.role === 'admin' || user.role === 'owner') {
    return <AdminDashboardView />;
  }

  // 教員ダッシュボード
  if (user.role === 'teacher') {
    return <TeacherDashboardView />;
  }

  // 従業員/学生ダッシュボード（既存の実装）
  return <EmployeeDashboard user={user} />;
};

/**
 * 従業員ダッシュボード（既存の実装を維持）
 */
const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ user }) => {
  const [attendanceData, setAttendanceData] = useState<AttendanceData>({
    todayStatus: null,
    weeklyStats: null,
    monthlyStats: null,
    annualStats: null,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showQRManagement, setShowQRManagement] = useState<boolean>(false);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!user || !user.id) {
        setIsLoading(false);
        return;
      }

      const today = new Date();
      const userId = user.id;

      // 組織情報を取得
      if (user.organization_id) {
        try {
          const orgResponse = await organizationApi.getOrganization(user.organization_id);
          if (orgResponse.success && orgResponse.data) {
            setOrganizationName(orgResponse.data.name || null);
          }
        } catch (orgError) {
          console.warn('組織情報の取得に失敗:', orgError);
        }
      }

      // 今日の出欠状況を取得
      const todayResponse = await attendanceApi.getAttendanceRecords(userId, {
        date: today.toISOString().split('T')[0],
      }) as unknown as ApiResponse<{ records: AttendanceRecord[] }>;

      // 統計を取得
      const weeklyResponse = await attendanceApi.getAttendanceStats(userId, 'week') as unknown as ApiResponse<AttendanceStats>;
      const monthlyResponse = await attendanceApi.getAttendanceStats(userId, 'month') as unknown as ApiResponse<AttendanceStats>;
      const annualResponse = await attendanceApi.getAttendanceStats(userId, 'year') as unknown as ApiResponse<AttendanceStats>;

      const records = (todayResponse.success && todayResponse.data && Array.isArray(todayResponse.data.records))
        ? todayResponse.data.records
        : [];

      setAttendanceData({
        todayStatus: records.length > 0 ? records[0] : null,
        weeklyStats: weeklyResponse.success && weeklyResponse.data ? weeklyResponse.data : null,
        monthlyStats: monthlyResponse.success && monthlyResponse.data ? monthlyResponse.data : null,
        annualStats: annualResponse.success && annualResponse.data ? annualResponse.data : null,
      });
    } catch (err) {
      console.error('ダッシュボードデータ読み込みエラー:', err);
      setError('データの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  const handleAttendanceAction = useCallback(async (action: string, recordId: number | null = null) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!user || !user.id) {
        setError('ユーザー情報が見つかりません');
        setIsLoading(false);
        return;
      }

      const response = await attendanceApi.recordAttendance(user.id, action, recordId) as unknown as ApiResponse;

      if (response.success) {
        loadDashboardData();
      } else {
        setError(response.message || '操作に失敗しました');
      }
    } catch (err) {
      console.error('出欠操作エラー:', err);
      setError('操作中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  }, [user, loadDashboardData]);

  const todayStatusDisplay = useMemo(() => {
    const status = attendanceData.todayStatus;
    if (!status) return '未登録';

    switch (status.status) {
      case 'present':
        return '出勤中';
      case 'absent':
        return '欠勤';
      case 'late':
        return '遅刻';
      case 'early_departure':
        return '早退';
      case 'break':
        return '休憩中';
      default:
        return '不明';
    }
  }, [attendanceData.todayStatus]);

  if (isLoading && !attendanceData.todayStatus) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <div className="spinner" />
          <p>ダッシュボードを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-container">
          <div className="error-message">
            {error}
            <button onClick={loadDashboardData} className="retry-button">
              再試行
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page" key={`dashboard-${user?.id}`}>
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">ダッシュボード</h1>
          <p className="dashboard-subtitle">{user?.name}さん、ようこそ</p>
        </div>

        <div className="dashboard-grid">
          {/* 今日の出欠 */}
          <div className="dashboard-card today-status">
            <h2 className="card-title">今日の状況</h2>

            {/* 所属組織表示 */}
            {organizationName && (
              <div className="organization-info">
                <span className="org-icon">🏫</span>
                <span className="org-name">{organizationName}</span>
              </div>
            )}

            <div className="status-display">
              <span className={`status-badge status-${attendanceData.todayStatus?.status || 'unknown'}`}>
                {todayStatusDisplay}
              </span>
            </div>
            {attendanceData.todayStatus && (
              <div className="attendance-times">
                <div className="time-item">
                  <span className="time-label">出勤:</span>
                  <span className="time-value">
                    {attendanceData.todayStatus.check_in_time || '---'}
                  </span>
                </div>
                <div className="time-item">
                  <span className="time-label">退勤:</span>
                  <span className="time-value">
                    {attendanceData.todayStatus.check_out_time || '---'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 月間サマリー */}
          <div className="dashboard-card monthly-stats">
            <h2 className="card-title">月間サマリー</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">出勤日数</span>
                <span className="stat-value">
                  {attendanceData.monthlyStats?.presentDays || 0}日
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">遅刻日数</span>
                <span className="stat-value">
                  {attendanceData.monthlyStats?.lateDays || 0}日
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">欠勤日数</span>
                <span className="stat-value">
                  {attendanceData.monthlyStats?.absentDays || 0}日
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">早退日数</span>
                <span className="stat-value">
                  {attendanceData.monthlyStats?.earlyDepartureDays || 0}日
                </span>
              </div>
            </div>
          </div>

          {/* 年間統計 - 月間サマリーの横に配置 */}
          <div className="dashboard-card annual-stats">
            <h2 className="card-title">年間統計</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">総出勤日数</span>
                <span className="stat-value">
                  {attendanceData.annualStats?.presentDays || 0}日
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">総遅刻日数</span>
                <span className="stat-value">
                  {attendanceData.annualStats?.lateDays || 0}日
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">総欠勤日数</span>
                <span className="stat-value">
                  {attendanceData.annualStats?.absentDays || 0}日
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">早退日数</span>
                <span className="stat-value">
                  {attendanceData.annualStats?.earlyDepartureDays || 0}日
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">総勤務時間</span>
                <span className="stat-value">
                  {attendanceData.annualStats?.totalHours || 0}時間
                </span>
              </div>
            </div>
          </div>

          {/* カレンダー - 下に全幅で配置 */}
          <div className="dashboard-card calendar-card">
            <h2 className="card-title">出欠カレンダー</h2>
            <div className="calendar-wrapper">
              {/* @ts-ignore: CalendarPage is still JS */}
              <CalendarPage isDashboardMode={true} key={`calendar-${user?.id}`} />
            </div>
          </div>

          {/* クイックアクション */}
          <div className="dashboard-card quick-actions-card">
            <h2 className="card-title">クイックアクション</h2>
            <div className="quick-actions">
              <Button
                variant="outline"
                onClick={() => window.location.href = '/calendar'}
                className="action-button"
              >
                カレンダー表示
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/reports'}
                className="action-button"
              >
                レポート表示
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* QR管理モーダル */}
      {showQRManagement && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <div className="modal-content" style={{
            background: 'white',
            padding: '25px',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
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

EmployeeDashboard.displayName = 'EmployeeDashboard';

DashboardPage.displayName = 'DashboardPage';

export default DashboardPage;
