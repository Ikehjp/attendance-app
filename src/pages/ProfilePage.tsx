import React, { useState, useEffect, useCallback, useRef } from 'react';
import useAuthStore from '../stores/authStore';
import { attendanceApi } from '../api/attendanceApi';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import './ProfilePage.css';

interface ProfileData {
  name: string;
  email: string;
  department?: string;
  student_id?: string;
  employee_id?: string;
  role: 'admin' | 'employee' | 'student';
  id: number | string;
  created_at?: string;
  felica_idm?: string | null;
  [key: string]: any;
}

interface RoleStatus {
  canUpdate: boolean;
  lastRoleUpdate: string | null;
  nextUpdateDate: string | null;
}

const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editData, setEditData] = useState<Record<string, any>>({});

  // ロール変更モーダルのための state
  const [showRoleModal, setShowRoleModal] = useState<boolean>(false);
  const [roleStatus, setRoleStatus] = useState<RoleStatus>({
    canUpdate: false,
    lastRoleUpdate: null,
    nextUpdateDate: null,
  });
  const [roleFormData, setRoleFormData] = useState({
    newRole: '',
    password: '',
  });
  const [roleError, setRoleError] = useState<string | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState<boolean>(false);

  // ICカード登録のための state
  const [showIcModal, setShowIcModal] = useState<boolean>(false);
  const [icStatus, setIcStatus] = useState<'idle' | 'waiting' | 'scanned' | 'complete'>('idle');
  const [scannedIdm, setScannedIdm] = useState<string | null>(null);
  const [icError, setIcError] = useState<string | null>(null);
  
  // ポーリング用のRef
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await attendanceApi.getUserProfile();

      if (response.success) {
        setProfile((response.data as any).user);
        setEditData({
          name: (response.data as any).user.name,
          email: (response.data as any).user.email,
          department: (response.data as any).user.department || '',
          student_id: (response.data as any).user.student_id || '',
        });

        // ロール変更ステータスも読み込む
        const statusRes = await attendanceApi.getRoleUpdateStatus();
        if (statusRes.success) {
          setRoleStatus(statusRes.data as any);
          // フォームの初期値を現在のロールと異なる方に設定
          setRoleFormData(prev => ({
            ...prev,
            newRole: (response.data as any).user.role === 'student' ? 'employee' : 'student',
          }));
        }

      } else {
        setError('プロファイル情報の取得に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || 'プロファイル情報の取得中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadProfile();
    }
  }, [isAuthenticated, user, loadProfile]);

  // モーダルを閉じる時のクリーンアップ
  useEffect(() => {
    return () => stopPolling();
  }, []);

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async () => {
    try {
      setIsLoading(true);
      if (!user) return;

      // departmentを除外（DBにカラムがない可能性）
      const { department, ...dataToSend } = editData;
      const response = await attendanceApi.updateUserProfile(user.id, dataToSend);
      if (response.success) {
        setIsEditing(false);
        // authStoreのユーザー情報も再取得
        await useAuthStore.getState().checkAuth();
        loadProfile();
      } else {
        setError(response.message || '更新に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || '更新中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // --- ロール変更ハンドラー ---
  const openRoleModal = () => {
    setRoleError(null);
    setRoleFormData(prev => ({ ...prev, password: '' }));
    setShowRoleModal(true);
  };

  const handleRoleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRoleFormData({ ...roleFormData, [e.target.name]: e.target.value });
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleError(null);

    if (roleFormData.newRole === profile?.role) {
      setRoleError('現在の役割と同じです');
      return;
    }

    if (!roleFormData.password) {
      setRoleError('確認のため現在のパスワードを入力してください');
      return;
    }

    try {
      setIsRoleLoading(true);
      const response = await attendanceApi.updateRole(
        roleFormData.newRole,
        roleFormData.password,
      );

      if (response.success) {
        setShowRoleModal(false);
        alert('役割が変更されました。セキュリティのため、自動的にログアウトします。新しい役割で再度ログインしてください。');
        logout();
      } else {
        setRoleError(response.message || '役割の変更に失敗しました');
      }
    } catch (err: any) {
      setRoleError(err.message || '役割の変更中にエラーが発生しました');
    } finally {
      setIsRoleLoading(false);
    }
  };

  // --- ICカード登録ハンドラー ---
  const handleStartIcRegistration = async () => {
    try {
      setIcError(null);
      // attendanceApiにメソッドが追加されている前提です
      await (attendanceApi as any).startIcRegistration();
      setIcStatus('waiting');
      setShowIcModal(true);
      
      // 2秒ごとにステータスを確認
      pollIntervalRef.current = setInterval(checkIcStatus, 2000);
    } catch (err: any) {
      // エラーハンドリング
      const msg = err.response?.data?.message || err.message || '登録モードの開始に失敗しました';
      alert(msg);
    }
  };

  const checkIcStatus = async () => {
    try {
      const res = await (attendanceApi as any).getIcRegistrationStatus();
      // status: 'idle' | 'waiting' | 'scanned'
      
      if (res.status === 'idle') {
        // タイムアウトなどで終了していた場合
        stopPolling();
        setIcStatus('idle');
        setIcError('タイムアウトしました。もう一度やり直してください。');
      } else if (res.status === 'scanned' && res.scannedIdm) {
        // カードがスキャンされた！
        stopPolling();
        setScannedIdm(res.scannedIdm);
        setIcStatus('scanned');
      }
      // waitingの場合は何もしない（継続）
    } catch (err) {
      stopPolling();
    }
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const handleConfirmIc = async () => {
    try {
      await (attendanceApi as any).confirmIcRegistration();
      setIcStatus('complete');
      // 少し待ってから閉じる
      setTimeout(() => {
        setShowIcModal(false);
        setIcStatus('idle');
        setScannedIdm(null);
        alert('ICカードを紐付けました！');
        // 情報更新のためリロード
        loadProfile();
      }, 1500);
    } catch (err: any) {
      setIcError('登録に失敗しました');
    }
  };

  const closeIcModal = () => {
    stopPolling();
    setShowIcModal(false);
    setIcStatus('idle');
    setScannedIdm(null);
  };

  if (isLoading && !profile) {
    return <div className="profile-page"><p>読み込み中...</p></div>;
  }

  if (error) {
    return <div className="profile-page"><p className="error-message">{error}</p></div>;
  }

  if (!profile) {
    return null;
  }

  const roleMap: Record<string, string> = {
    admin: '管理者',
    employee: '教員',
    student: '学生',
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <h1>プロフィール</h1>
          <div className="profile-actions">
            {isEditing ? (
              <div className="edit-actions">
                <Button variant="secondary" onClick={() => setIsEditing(false)} disabled={isLoading}>
                  キャンセル
                </Button>
                <Button variant="primary" onClick={handleSaveProfile} loading={isLoading}>
                  保存
                </Button>
              </div>
            ) : (
              <Button variant="primary" onClick={() => setIsEditing(true)}>
                編集
              </Button>
            )}
          </div>
        </div>

        <div className="profile-content">
          <div className="profile-card">
            <div className="profile-avatar-section">
              <div className="profile-avatar">
                {profile.name.charAt(0)}
              </div>
              <div className="profile-basic-info">
                {isEditing ? (
                  <Input
                    name="name"
                    value={editData.name}
                    onChange={handleEditChange}
                    className="edit-input edit-input--name"
                  />
                ) : (
                  <h2>{profile.name}</h2>
                )}
                <p>{roleMap[profile.role]}</p>
              </div>
            </div>

            <div className="profile-details">
              <div className="profile-grid">
                <div className="profile-field">
                  <span className="field-label">メールアドレス</span>
                  {isEditing ? (
                    <Input
                      name="email"
                      type="email"
                      value={editData.email}
                      onChange={handleEditChange}
                      className="edit-input"
                    />
                  ) : (
                    <p className="field-value">{profile.email}</p>
                  )}
                </div>

                {profile.role !== 'student' && (
                  <div className="profile-field">
                    <span className="field-label">部署</span>
                    {isEditing ? (
                      <Input
                        name="department"
                        value={editData.department}
                        onChange={handleEditChange}
                        className="edit-input"
                      />
                    ) : (
                      <p className="field-value">{profile.department || '未設定'}</p>
                    )}
                  </div>
                )}

                {profile.role === 'student' && (
                  <div className="profile-field">
                    <span className="field-label">学生ID</span>
                    {isEditing ? (
                      <Input
                        name="student_id"
                        value={editData.student_id}
                        onChange={handleEditChange}
                        className="edit-input"
                        placeholder="学生IDを入力"
                      />
                    ) : (
                      <p className="field-value">{profile.student_id || '未設定'}</p>
                    )}
                  </div>
                )}

                {profile.role === 'employee' && (
                  <div className="profile-field">
                    <span className="field-label">社員ID</span>
                    <p className="field-value">{profile.employee_id || '未設定'}</p>
                  </div>
                )}

                <div className="profile-field">
                  <span className="field-label">ユーザーID</span>
                  <p className="field-value field-value--muted">{profile.id}</p>
                </div>

                <div className="profile-field">
                  <span className="field-label">登録日</span>
                  <p className="field-value field-value--muted">
                    {profile.created_at ? new Date(profile.created_at).toLocaleDateString('ja-JP') : '不明'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ロール変更セクション */}
          <div className="profile-card profile-role-change">
            <div className="profile-details">
              <div className="profile-field">
                <span className="field-label">役割（ロール）の変更</span>
                <p>
                  役割（「学生」または「教員」）を変更します。この操作はトラブル防止のため、90日に1回のみ可能です。
                </p>
                {roleStatus.lastRoleUpdate && (
                  <p className="field-value--muted">
                    前回の変更日: {new Date(roleStatus.lastRoleUpdate).toLocaleDateString('ja-JP')}
                  </p>
                )}
                <Button
                  variant="danger"
                  onClick={openRoleModal}
                  disabled={!roleStatus.canUpdate}
                >
                  役割を変更する
                </Button>
                {!roleStatus.canUpdate && (
                  <p className="error-message error-message--inline">
                    次回の変更は {roleStatus.nextUpdateDate} 以降に可能です。
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ICカード連携セクション */}
          <div className="profile-card profile-role-change" style={{ marginTop: '20px', borderColor: '#bfdbfe', background: '#eff6ff' }}>
              <div className="profile-details">
                <div className="profile-field">
                  <span className="field-label" style={{ color: '#1e40af' }}>ICカード連携</span>
                  
                  {profile.felica_idm ? (
                    /* 登録済みの場合 */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.5rem' }}>✅</span>
                        <div>
                          <p style={{ margin: 0, fontWeight: 'bold', color: '#1e40af' }}>登録済み</p>
                          <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>ID: {profile.felica_idm}</p>
                        </div>
                      </div>
                      <Button 
                        variant="secondary" 
                        onClick={handleStartIcRegistration}
                        style={{ width: 'fit-content', fontSize: '0.9rem' }}
                      >
                        別のカードに変更する
                      </Button>
                    </div>
                  ) : (
                    /* 未登録の場合 */
                    <>
                      <p style={{ color: '#3b82f6' }}>
                        SuicaなどのICカードを登録すると、タッチするだけで出席登録ができるようになります。
                      </p>
                      <Button 
                        variant="primary" 
                        onClick={handleStartIcRegistration}
                        style={{ backgroundColor: '#2563eb' }}
                      >
                        ICカードを登録する
                      </Button>
                    </>
                  )}
                  
                </div>
              </div>
          </div>
        </div>
      </div>

      {/* ロール変更モーダル */}
      {showRoleModal && (
        <div className="role-modal-overlay">
          <div className="role-modal-content">
            <h2>役割（ロール）の変更</h2>
            <p className="warning-text">
              <strong>警告:</strong> 役割を変更すると、現在のアカウントの権限が完全に切り替わります。
              学生から教員（またはその逆）になる場合のみ使用してください。
              この操作は90日に1回しか実行できません。
            </p>

            <form onSubmit={handleRoleSubmit}>
              <div className="form-group">
                <span className="field-label">新しい役割</span>
                <div className="role-selection" role="radiogroup" aria-label="新しい役割">
                  <label>
                    <input
                      type="radio"
                      name="newRole"
                      value="student"
                      checked={roleFormData.newRole === 'student'}
                      onChange={handleRoleFormChange}
                    />
                    学生
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="newRole"
                      value="employee"
                      checked={roleFormData.newRole === 'employee'}
                      onChange={handleRoleFormChange}
                    />
                    教員
                  </label>
                </div>
              </div>

              <Input
                label="現在のパスワード（確認用）"
                type="password"
                name="password"
                value={roleFormData.password}
                onChange={handleRoleFormChange}
                required
                placeholder="セキュリティ確認のため必須"
              />

              {roleError && (
                <p className="error-message">{roleError}</p>
              )}

              <div className="modal-actions">
                <Button type="button" variant="secondary" onClick={() => setShowRoleModal(false)} disabled={isRoleLoading}>
                  キャンセル
                </Button>
                <Button type="submit" variant="danger" loading={isRoleLoading}>
                  変更を実行する
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IC登録モーダル */}
      {showIcModal && (
        <div className="role-modal-overlay">
          <div className="role-modal-content" style={{ textAlign: 'center' }}>
            <h2 style={{ color: '#333' }}>ICカード登録</h2>
            
            {icStatus === 'waiting' && (
              <div style={{ padding: '20px' }}>
                <div className="loading-spinner" style={{ margin: '0 auto 20px' }} />
                <p>カードリーダーに<br/>ICカードをかざしてください...</p>
                <p style={{ fontSize: '0.8rem', color: '#666' }}>残り時間: 30秒</p>
              </div>
            )}

            {icStatus === 'scanned' && (
              <div style={{ padding: '20px' }}>
                <p style={{ fontSize: '3rem' }}>💳</p>
                <p>カードを検出しました！</p>
                <p style={{ background: '#eee', padding: '10px', fontFamily: 'monospace' }}>
                  ID: {scannedIdm}
                </p>
                <div className="modal-actions" style={{ justifyContent: 'center' }}>
                  <Button variant="primary" onClick={handleConfirmIc}>
                    このカードを登録する
                  </Button>
                </div>
              </div>
            )}

            {icStatus === 'complete' && (
              <div style={{ padding: '20px' }}>
                <p style={{ fontSize: '3rem' }}>✅</p>
                <p>登録が完了しました！</p>
              </div>
            )}

            {icError && (
              <p className="error-message">{icError}</p>
            )}

            {icStatus !== 'complete' && (
              <Button variant="secondary" onClick={closeIcModal} style={{ marginTop: '20px' }}>
                キャンセル
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;