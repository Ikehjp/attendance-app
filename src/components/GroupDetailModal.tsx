import React, { useState, useEffect, useCallback } from 'react';
import { groupApi } from '../api';
import './GroupDetailModal.css';

interface Group {
  id: number;
  name: string;
  grade?: string;
  academic_year?: string;
  description?: string;
  created_at: string;
}

interface GroupMember {
  student_id: string | number;
  student_name: string;
}

interface GroupTeacher {
  user_id: number;
  teacher_name: string;
  role: 'main' | 'assistant';
}

interface GroupDetailModalProps {
  group: Group | null;
  onClose: () => void;
  onUpdate?: () => void;
}

/**
 * グループ詳細モーダル
 * メンバー管理と教員割り当て機能を含む
 */
const GroupDetailModal: React.FC<GroupDetailModalProps> = ({ group, onClose, onUpdate }) => {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [teachers, setTeachers] = useState<GroupTeacher[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'teachers' | 'info'>('members'); // 'members' | 'teachers' | 'info'

  // メンバー追加用
  const [showAddMember, setShowAddMember] = useState<boolean>(false);
  const [newMemberStudentId, setNewMemberStudentId] = useState<string>('');

  // 教員追加用
  const [showAddTeacher, setShowAddTeacher] = useState<boolean>(false);
  const [newTeacherUserId, setNewTeacherUserId] = useState<string>('');
  const [newTeacherRole, setNewTeacherRole] = useState<'main' | 'assistant'>('main');

  const fetchGroupDetails = useCallback(async () => {
    if (!group) return;
    setLoading(true);
    setError(null);

    try {
      const [membersResponse, teachersResponse] = await Promise.all([
        groupApi.getGroupMembers(group.id),
        groupApi.getGroupTeachers(group.id),
      ]);

      if (membersResponse.success) {
        // membersResponse.data.members が配列であることを確認
        // Casting as any briefly to access potentially nested structure or infer from usage
        const data = membersResponse.data as any;
        const membersData = data && data.members;
        setMembers(Array.isArray(membersData) ? membersData : []);
      }

      if (teachersResponse.success) {
        const data = teachersResponse.data as any;
        const teachersData = data && data.teachers;
        setTeachers(Array.isArray(teachersData) ? teachersData : []);
      }
    } catch (err: any) {
      setError(err.message || 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.id]);

  useEffect(() => {
    if (group?.id) {
      fetchGroupDetails();
    }
  }, [group?.id, fetchGroupDetails]);

  const handleAddMember = async () => {
    if (!group) return;
    if (!newMemberStudentId) {
      setError('学生IDを入力してください');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await groupApi.addMember(group.id, newMemberStudentId);

      if (response.success) {
        setNewMemberStudentId('');
        setShowAddMember(false);
        fetchGroupDetails();
        if (onUpdate) {
          onUpdate();
        }
      } else {
        setError(response.message || 'メンバーの追加に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || 'メンバーの追加に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (studentId: string | number) => {
    if (!group) return;
    if (!window.confirm('このメンバーをグループから削除しますか？')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await groupApi.removeMember(group.id, studentId);

      if (response.success) {
        fetchGroupDetails();
        if (onUpdate) {
          onUpdate();
        }
      } else {
        setError(response.message || 'メンバーの削除に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || 'メンバーの削除に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeacher = async () => {
    if (!group) return;
    if (!newTeacherUserId) {
      setError('教員IDを入力してください');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await groupApi.assignTeacher(
        group.id,
        parseInt(newTeacherUserId, 10),
        newTeacherRole,
      );

      if (response.success) {
        setNewTeacherUserId('');
        setNewTeacherRole('main');
        setShowAddTeacher(false);
        fetchGroupDetails();
        if (onUpdate) {
          onUpdate();
        }
      } else {
        setError(response.message || '教員の割り当てに失敗しました');
      }
    } catch (err) {
      setError(err.message || '教員の割り当てに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTeacher = async (userId: number) => {
    if (!group) return;
    if (!window.confirm('この教員の割り当てを解除しますか？')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await groupApi.removeTeacher(group.id, userId);

      if (response.success) {
        fetchGroupDetails();
        if (onUpdate) {
          onUpdate();
        }
      } else {
        setError(response.message || '教員の削除に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || '教員の削除に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (!group) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content group-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{group.name}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="modal-tabs">
          <button
            className={`tab-button ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            基本情報
          </button>
          <button
            className={`tab-button ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            メンバー ({members.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'teachers' ? 'active' : ''}`}
            onClick={() => setActiveTab('teachers')}
          >
            担当教員 ({teachers.length})
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'info' && (
            <div className="info-tab">
              <div className="info-item">
                <span className="info-label">グループ名:</span>
                <span className="info-value">{group.name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">学年:</span>
                <span className="info-value">{group.grade || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">年度:</span>
                <span className="info-value">{group.academic_year || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">説明:</span>
                <span className="info-value">{group.description || 'なし'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">作成日:</span>
                <span className="info-value">
                  {new Date(group.created_at).toLocaleDateString('ja-JP')}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="members-tab">
              <div className="tab-header">
                <h3>メンバー一覧</h3>
                <button
                  className="btn btn--primary btn--sm"
                  onClick={() => setShowAddMember(true)}
                  disabled={loading}
                >
                  + メンバー追加
                </button>
              </div>

              {showAddMember && (
                <div className="add-form">
                  <input
                    type="text"
                    placeholder="学生ID"
                    value={newMemberStudentId}
                    onChange={(e) => setNewMemberStudentId(e.target.value)}
                    className="form-input"
                  />
                  <button
                    className="btn btn--primary btn--sm"
                    onClick={handleAddMember}
                    disabled={loading}
                  >
                    追加
                  </button>
                  <button
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      setShowAddMember(false);
                      setNewMemberStudentId('');
                    }}
                  >
                    キャンセル
                  </button>
                </div>
              )}

              {loading ? (
                <div className="loading">読み込み中...</div>
              ) : members.length === 0 ? (
                <div className="empty-state">メンバーがいません</div>
              ) : (
                <div className="member-list">
                  {members.map((member) => (
                    <div key={member.student_id} className="member-item">
                      <div className="member-info">
                        <span className="member-name">{member.student_name || member.student_id}</span>
                        <span className="member-id">{member.student_id}</span>
                      </div>
                      <button
                        className="btn btn--danger btn--sm"
                        onClick={() => handleRemoveMember(member.student_id)}
                        disabled={loading}
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'teachers' && (
            <div className="teachers-tab">
              <div className="tab-header">
                <h3>担当教員一覧</h3>
                <button
                  className="btn btn--primary btn--sm"
                  onClick={() => setShowAddTeacher(true)}
                  disabled={loading}
                >
                  + 教員追加
                </button>
              </div>

              {showAddTeacher && (
                <div className="add-form">
                  <input
                    type="number"
                    placeholder="教員ID"
                    value={newTeacherUserId}
                    onChange={(e) => setNewTeacherUserId(e.target.value)}
                    className="form-input"
                  />
                  <select
                    value={newTeacherRole}
                    onChange={(e) => setNewTeacherRole(e.target.value as 'main' | 'assistant')}
                    className="form-select"
                  >
                    <option value="main">主担当</option>
                    <option value="assistant">副担当</option>
                  </select>
                  <button
                    className="btn btn--primary btn--sm"
                    onClick={handleAddTeacher}
                    disabled={loading}
                  >
                    追加
                  </button>
                  <button
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      setShowAddTeacher(false);
                      setNewTeacherUserId('');
                      setNewTeacherRole('main');
                    }}
                  >
                    キャンセル
                  </button>
                </div>
              )}

              {loading ? (
                <div className="loading">読み込み中...</div>
              ) : teachers.length === 0 ? (
                <div className="empty-state">担当教員がいません</div>
              ) : (
                <div className="teacher-list">
                  {teachers.map((teacher) => (
                    <div key={teacher.user_id} className="teacher-item">
                      <div className="teacher-info">
                        <span className="teacher-name">{teacher.teacher_name || `教員${teacher.user_id}`}</span>
                        <span className={`teacher-role ${teacher.role}`}>
                          {teacher.role === 'main' ? '主担当' : '副担当'}
                        </span>
                      </div>
                      <button
                        className="btn btn--danger btn--sm"
                        onClick={() => handleRemoveTeacher(teacher.user_id)}
                        disabled={loading}
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn--secondary" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupDetailModal;
