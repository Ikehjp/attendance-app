import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import { useLoginRedirect } from '../hooks/useLoginRedirect';
import { attendanceApi } from '../api/attendanceApi';
import StudentQRScanner from '../components/common/StudentQRScanner';
import './StudentDashboardPage.css';

interface StudentGroup {
  id: string;
  group_name: string;
  status: string;
  description?: string;
  creator_name: string;
  joined_at: string;
  icon?: string;
  members?: { student_id: string; status: string }[];
  [key: string]: any;
}

interface Invitation {
  id: string;
  group_name: string;
  status: string;
  creator_name: string;
  created_at: string;
  icon?: string;
  [key: string]: any;
}

interface ScanResult {
  action: 'checkin' | 'checkout';
  checkInTime: string;
  checkOutTime: string;
  [key: string]: any;
}

interface AttendanceResult {
  success: boolean;
  status: 'present' | 'late';
  message: string;
  location?: string;
  logicalDate?: string;
  time: string;
  [key: string]: any;
}

const StudentDashboardPage: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const { requireAuth } = useLoginRedirect();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showQRScanner, setShowQRScanner] = useState<boolean>(false);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [classSelectionData, setClassSelectionData] = useState<any>(null);
  // 出席結果モーダル用state
  const [attendanceResult, setAttendanceResult] = useState<AttendanceResult | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.student_id) {
        loadStudentData();
      } else {
        // student_idがない場合（管理者プレビューモードなど）
        // ダミーデータまたは空のデータを設定してローディングを終了
        setIsLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.student_id]);

  const loadStudentData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 管理者プレビューモードの場合（student_idがない場合）
      if (!user?.student_id) {
        // ダミーデータをセットして終了
        setGroups([
          {
            id: 'dummy-1',
            group_name: '【プレビュー】プログラミング演習I',
            status: 'joined',
            description: 'これは管理者プレビュー用のダミーデータです。',
            creator_name: '山田 先生',
            joined_at: new Date().toISOString(),
          },
          {
            id: 'dummy-2',
            group_name: '【プレビュー】Web開発プロジェクト',
            status: 'joined',
            description: '実際の学生画面では、参加しているグループが表示されます。',
            creator_name: '鈴木 先生',
            joined_at: new Date().toISOString(),
          },
        ]);
        setInvitations([
          {
            id: 'dummy-invitation',
            group_name: '【プレビュー】特別講義',
            status: 'invited',
            creator_name: '佐藤 先生',
            created_at: new Date().toISOString(),
          },
        ]);
        setIsLoading(false);
        return;
      }

      // 学生のグループ一覧を取得
      const response = await attendanceApi.getStudentGroups(user.student_id);

      if (response.success) {
        const studentGroups = (response.data as any).groups as StudentGroup[];

        // グループごとのステータスを判定（バックエンドがstatusを直接返さない場合、membersから判定）
        const groupsWithStatus = studentGroups.map(group => {
          const myMemberInfo = group.members?.find(m => m.student_id === user?.student_id);
          return {
            ...group,
            status: myMemberInfo ? myMemberInfo.status : group.status,
          };
        });

        // 参加済みグループと招待中のグループを分離
        const joinedGroups = groupsWithStatus.filter(group => group.status === 'accepted' || group.status === 'joined');
        const invitedGroups = groupsWithStatus.filter(group => group.status === 'pending' || group.status === 'invited');

        setGroups(joinedGroups);
        setInvitations(invitedGroups.map(g => ({
          ...g,
          created_at: g.joined_at, // Fallback to joined_at for invitations if created_at is missing
        })) as unknown as Invitation[]);
      } else {
        setError('グループ情報の読み込みに失敗しました');
      }
    } catch (err) {
      setError('グループ情報の読み込みに失敗しました');
      // 開発環境でのみエラーログ出力
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('学生データ読み込みエラー:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvitation = async (groupId: string) => {
    requireAuth(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await attendanceApi.respondToInvitation(user?.student_id, groupId, 'accept');

        if (response.success) {
          await loadStudentData(); // データを再読み込み
        } else {
          setError(response.message || '招待の承諾に失敗しました');
        }
      } catch (err) {
        setError('招待の承諾に失敗しました');
        // 開発環境でのみエラーログ出力
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('招待承諾エラー:', err);
        }
      } finally {
        setIsLoading(false);
      }
    });
  };

  const handleQRScan = async (scanData: any) => {
    requireAuth(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await attendanceApi.recordScan(
          scanData.qrData,
          new Date().toISOString(),
        );

        if (response.success && (response as any).requiresSelection) {
          // 複数授業がある場合は選択UIを表示
          setClassSelectionData(response.data);
        } else if (response.success) {
          // 記録成功 - 結果をモーダルで表示
          setShowQRScanner(false);
          setClassSelectionData(null);
          setAttendanceResult({
            success: true,
            status: (response as any).status || 'present',
            message: response.message || '出席を記録しました',
            location: (response as any).location,
            logicalDate: (response as any).logicalDate,
            time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
          });
          await loadStudentData();
        } else {
          setError(response.message || 'スキャンに失敗しました');
        }
      } catch (err) {
        setError('出欠記録の送信に失敗しました');
        // 開発環境でのみエラーログ出力
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('出欠記録エラー:', err);
        }
      } finally {
        setIsLoading(false);
      }
    });
  };

  // 遅刻届を出す
  const handleLateRequest = () => {
    if (attendanceResult) {
      navigate(`/absence-request?type=late&date=${attendanceResult.logicalDate}`);
      setAttendanceResult(null);
    }
  };

  // 結果モーダルを閉じる
  const closeResultModal = () => {
    setAttendanceResult(null);
  };

  const handleSelectClass = async (classId: string) => {
    try {
      setIsLoading(true);
      const response = await attendanceApi.confirmClassAttendance(
        classId,
        new Date().toISOString(),
      );

      if (response.success) {
        setShowQRScanner(false);
        setClassSelectionData(null);
        alert('出席記録が完了しました！');
        await loadStudentData();
      } else {
        setError(response.message || '出席記録に失敗しました');
      }
    } catch (err) {
      setError('出欠記録の送信に失敗しました');
      // 開発環境でのみエラーログ出力
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('出欠記録エラー:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenQRScanner = () => {
    setShowQRScanner(true);
    setError(null);
  };

  const handleCloseQRScanner = () => {
    setShowQRScanner(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="student-dashboard-page">
        <div className="access-denied">
          <h2>ログインが必要です</h2>
          <p>このページにアクセスするにはログインが必要です。</p>
        </div>
      </div>
    );
  }

  if (isLoading && groups.length === 0 && invitations.length === 0) {
    return (
      <div className="student-dashboard-page">
        <div className="loading">
          <div className="spinner" />
          <p>ダッシュボードを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-dashboard-page">
      <div className="student-dashboard-container">
        <div className="dashboard-header">
          {!user?.student_id && (
            <div style={{
              backgroundColor: '#fff3cd',
              color: '#856404',
              padding: '10px',
              borderRadius: '5px',
              marginBottom: '15px',
              border: '1px solid #ffeeba',
            }}>
              <strong>⚠️ 管理者プレビューモード</strong>
              <p style={{ margin: '5px 0 0 0', fontSize: '0.9em' }}>
                現在、管理者として学生画面をプレビューしています。表示されているデータはダミーです。
                実際の操作（QRスキャンや招待承諾など）は機能しません。
              </p>
            </div>
          )}
          <h1>学生ダッシュボード</h1>
          <div className="student-info">
            <p>ようこそ、{user?.name || '学生'}さん</p>
            <p>学生ID: {user?.student_id || 'PREVIEW'}</p>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <button
              className="retry-button"
              onClick={loadStudentData}
            >
              再試行
            </button>
          </div>
        )}

        {/* QRコードスキャンセクション */}
        <div className="qr-scan-section">
          <div className="section-header">
            <h2>📱 QRコードスキャン</h2>
            <p>グループのQRコードをスキャンして出欠記録を行います</p>
          </div>
          <button
            className="btn btn--primary btn--large"
            onClick={handleOpenQRScanner}
            disabled={isLoading}
          >
            QRコードをスキャン
          </button>
        </div>

        {/* 招待中のグループ */}
        {invitations.length > 0 && (
          <div className="invitations-section">
            <div className="section-header">
              <h2>📨 招待中のグループ</h2>
              <p>参加を承諾するグループがあります</p>
            </div>
            <div className="invitations-list">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="invitation-card">
                  <div className="invitation-info">
                    {invitation.icon && <span className="group-icon" style={{ fontSize: '1.5rem', marginRight: '8px' }}>{invitation.icon}</span>}
                    <h3>{invitation.group_name}</h3>
                    <p>招待者: {invitation.creator_name}</p>
                    <p>招待日: {new Date(invitation.created_at).toLocaleDateString('ja-JP')}</p>
                  </div>
                  <div className="invitation-actions">
                    <button
                      className="btn btn--primary"
                      onClick={() => handleAcceptInvitation(invitation.id)}
                      disabled={isLoading}
                    >
                      参加する
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 参加中のグループ */}
        <div className="groups-section">
          <div className="section-header">
            <h2>👥 参加中のグループ</h2>
            <p>現在参加しているグループ一覧</p>
          </div>

          {groups.length === 0 ? (
            <div className="no-groups">
              <p>参加しているグループがありません</p>
              <p>教員からグループに招待されると、ここに表示されます。</p>
            </div>
          ) : (
            <div className="groups-grid">
              {groups.map((group) => (
                <div key={group.id} className="group-card">
                  <div className="group-card-header">
                    {group.icon && <span className="group-icon" style={{ fontSize: '1.5rem', marginRight: '8px' }}>{group.icon}</span>}
                    <h3>{group.group_name}</h3>
                    <span className="group-status">参加中</span>
                  </div>

                  <div className="group-card-content">
                    {group.description && (
                      <p className="group-description">{group.description}</p>
                    )}

                    <div className="group-info">
                      <p><strong>作成者:</strong> {group.creator_name}</p>
                      <p><strong>参加日:</strong> {new Date(group.joined_at).toLocaleDateString('ja-JP')}</p>
                    </div>
                  </div>

                  <div className="group-card-footer">
                    <button
                      className="btn btn--secondary"
                      onClick={() => {
                        // グループ詳細ページへの遷移（実装予定）
                        alert('グループ詳細機能は実装予定です');
                      }}
                    >
                      詳細を見る
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 最近の出欠記録 */}
        {lastScanResult && (
          <div className="recent-activity">
            <div className="section-header">
              <h2>📊 最近の活動</h2>
            </div>
            <div className="activity-card">
              <div className="activity-icon">
                {lastScanResult.action === 'checkin' ? '✅' : '🚪'}
              </div>
              <div className="activity-info">
                <h3>
                  {lastScanResult.action === 'checkin' ? '出席記録' : '退出記録'}
                </h3>
                <p>
                  {lastScanResult.action === 'checkin'
                    ? `出席時刻: ${new Date(lastScanResult.checkInTime).toLocaleString('ja-JP')}`
                    : `退出時刻: ${new Date(lastScanResult.checkOutTime).toLocaleString('ja-JP')}`
                  }
                </p>
                <p className="activity-time">
                  {new Date().toLocaleString('ja-JP')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QRコードスキャナー */}
      <StudentQRScanner
        isOpen={showQRScanner}
        onScan={handleQRScan}
        onClose={handleCloseQRScanner}
        scanResult={classSelectionData}
        onSelectClass={handleSelectClass}
      />

      {/* 出席結果モーダル */}
      {attendanceResult && (
        <div className="attendance-result-overlay" onClick={closeResultModal}>
          <div
            className={`attendance-result-modal ${attendanceResult.status === 'late' ? 'late' : 'present'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="result-icon">
              {attendanceResult.status === 'late' ? '⏰' : '✅'}
            </div>
            <h2 className="result-title">
              {attendanceResult.status === 'late' ? '遅刻' : '出席'}
            </h2>
            <p className="result-message">{attendanceResult.message}</p>

            <div className="result-details">
              <div className="detail-row">
                <span className="detail-label">時刻</span>
                <span className="detail-value">{attendanceResult.time}</span>
              </div>
              {attendanceResult.location && (
                <div className="detail-row">
                  <span className="detail-label">場所</span>
                  <span className="detail-value">{attendanceResult.location}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">日付</span>
                <span className="detail-value">{attendanceResult.logicalDate}</span>
              </div>
            </div>

            <div className="result-actions">
              {attendanceResult.status === 'late' && (
                <button
                  className="btn btn-warning"
                  onClick={handleLateRequest}
                >
                  📝 遅刻届を提出
                </button>
              )}
              <button
                className="btn btn-primary"
                onClick={closeResultModal}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboardPage;
