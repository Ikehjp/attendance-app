import React, { useState, useEffect } from 'react';
import useAuthStore from '../stores/authStore';
import { useLoginRedirect } from '../hooks/useLoginRedirect';
import { groupApi } from '../api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import GroupDetailModal from '../components/GroupDetailModal';
import './GroupsPage.css';

interface Group {
  id: number;
  name: string;
  icon?: string;
  grade?: string;
  academic_year?: string;
  description?: string;
  member_count?: number;
  is_active?: boolean;
  created_at?: string;
}

interface GroupFormData {
  name: string;
  icon: string;
  grade: string;
  academic_year: string;
  description: string;
}

const GroupsPage: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const { requireAuth } = useLoginRedirect();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  // フォーム状態
  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    icon: '',
    grade: '',
    academic_year: new Date().getFullYear().toString(),
    description: '',
  });

  const loadGroups = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await groupApi.getGroups();

      if (response.success && response.data && response.data.groups) {
        // Casting as any mostly to deal with potential API inconsistency or deeply nested response
        const groupsData = (response.data as any).groups;
        setGroups(Array.isArray(groupsData) ? groupsData : []);
      } else {
        setError(response.message || 'グループ一覧の読み込みに失敗しました');
      }
    } catch (err) {
      setError(err.message || 'グループ一覧の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    requireAuth(loadGroups);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setError('グループ名は必須です');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await groupApi.createGroup({
        name: formData.name,
        icon: formData.icon,
        grade: formData.grade,
        academic_year: formData.academic_year,
        description: formData.description,
      });

      if (response.success) {
        setShowCreateForm(false);
        setFormData({
          name: '',
          icon: '',
          grade: '',
          academic_year: new Date().getFullYear().toString(),
          description: '',
        });
        loadGroups();
      } else {
        setError(response.message || 'グループの作成に失敗しました');
      }
    } catch (err) {
      setError(err.message || 'グループの作成中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (!window.confirm('本当にこのグループを削除しますか？')) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await groupApi.deleteGroup(groupId);
      if (response.success) {
        loadGroups();
        if (selectedGroup && selectedGroup.id === groupId) {
          setSelectedGroup(null);
        }
      } else {
        setError(response.message || 'グループの削除に失敗しました');
      }
    } catch (err) {
      setError(err.message || 'グループの削除中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && groups.length === 0) {
    return (
      <div className="groups-page">
        <div className="loading-container">
          <div className="spinner" />
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="groups-page">
      <div className="groups-container">
        <div className="groups-header">
          <div>
            <h1>グループ管理</h1>
            <p className="subtitle">クラスやグループを管理します</p>
          </div>
          <Button variant="primary" onClick={() => setShowCreateForm(true)}>
            + 新規グループ作成
          </Button>
        </div>

        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {showCreateForm && (
          <div className="group-form-overlay" onClick={() => setShowCreateForm(false)}>
            <div className="group-form" onClick={(e) => e.stopPropagation()}>
              <h2>新規グループ作成</h2>
              <form onSubmit={handleCreateGroup}>
                <Input
                  label="グループ名"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="例: 1年A組"
                />
                <Input
                  label="アイコン（絵文字）"
                  type="text"
                  name="icon"
                  value={formData.icon}
                  onChange={handleInputChange}
                  placeholder="例: 📚 📖 🎓"
                  maxLength={10}
                />
                <Input
                  label="学年"
                  type="text"
                  name="grade"
                  value={formData.grade}
                  onChange={handleInputChange}
                  placeholder="例: 1年"
                />
                <Input
                  label="年度"
                  type="text"
                  name="academic_year"
                  value={formData.academic_year}
                  onChange={handleInputChange}
                  placeholder="例: 2025"
                />
                <Input
                  label="説明（任意）"
                  type="textarea"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="グループの説明を入力してください"
                />
                <div className="form-actions">
                  <Button type="button" variant="secondary" onClick={() => setShowCreateForm(false)} disabled={isLoading}>
                    キャンセル
                  </Button>
                  <Button type="submit" variant="primary" loading={isLoading}>
                    作成
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="groups-content">
          {groups.length === 0 && !isLoading ? (
            <div className="no-groups">
              <div className="empty-icon">📚</div>
              <h3>グループがありません</h3>
              <p>「新規グループ作成」ボタンから最初のグループを作成しましょう</p>
            </div>
          ) : (
            <div className="groups-grid">
              {groups.map((group) => (
                <div key={group.id} className="group-card">
                  <div className="group-card-header">
                    <div>
                      {group.icon && <span className="group-icon" style={{ fontSize: '1.5rem', marginRight: '8px' }}>{group.icon}</span>}
                      <h2 className="group-name">{group.name}</h2>
                      {group.grade && (
                        <span className="group-badge">{group.grade}</span>
                      )}
                    </div>
                    <div className="group-actions">
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => setSelectedGroup(group)}
                      >
                        詳細
                      </Button>
                      {user?.role === 'admin' && (
                        <Button
                          variant="danger"
                          size="small"
                          onClick={() => handleDeleteGroup(group.id)}
                          disabled={isLoading}
                        >
                          削除
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="group-card-body">
                    {group.description && (
                      <p className="group-description">{group.description}</p>
                    )}

                    <div className="group-stats">
                      <div className="stat-item">
                        <span className="stat-icon">👥</span>
                        <span className="stat-label">メンバー</span>
                        <span className="stat-value">{group.member_count || 0}名</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-icon">📅</span>
                        <span className="stat-label">年度</span>
                        <span className="stat-value">{group.academic_year || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="group-card-footer">
                    <button
                      className="btn-link"
                      onClick={() => setSelectedGroup(group)}
                    >
                      メンバー管理 →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedGroup && (
        <GroupDetailModal
          group={selectedGroup as any}
          onClose={() => setSelectedGroup(null)}
          onUpdate={loadGroups}
        />
      )}
    </div>
  );
};

export default GroupsPage;
