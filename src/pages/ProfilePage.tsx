import React, { useState, useEffect, useCallback } from 'react';
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

  // [新規] ロール変更モーダルのための state
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

        // [新規] ロール変更ステータスも読み込む
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

  // --- [新規] ロール変更ハンドラー ---
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

          {/* [新規] ロール変更セクション */}
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
        </div>
      </div>

      {/* [新規] ロール変更モーダル */}
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
    </div>
  );
};

export default ProfilePage;
