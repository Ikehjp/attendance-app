import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import { attendanceApi } from '../api/attendanceApi';
import Button from '../components/common/Button';
import './AdminUsersPage.css';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    student_id?: string;
    organization_id?: number;
    last_role_update?: string;
    created_at: string;
    canPromote: boolean;
    canDemote: boolean;
    nextDemoteDate?: string;
}

interface RoleChangeModalProps {
    user: User;
    newRole: 'student' | 'employee';
    onClose: () => void;
    onConfirm: () => Promise<void>;
    loading: boolean;
}

const RoleChangeModal: React.FC<RoleChangeModalProps> = ({ user, newRole, onClose, onConfirm, loading }) => {
    const isPromotion = newRole === 'employee';
    const actionText = isPromotion ? '昇格' : '降格';
    const newRoleText = isPromotion ? '教員' : '生徒';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content role-change-modal" onClick={(e) => e.stopPropagation()}>
                <h2>⚠️ 警告</h2>

                <p className="modal-description">
                    <strong>{user.name}</strong> さんを「<strong>{newRoleText}</strong>」に{actionText}しようとしています。
                </p>

                <div className="warning-box">
                    <h3 className="warning-title">【重要】</h3>
                    <ul className="warning-list">
                        {isPromotion ? (
                            <>
                                <li>このユーザーはグループ作成などの<strong>教員権限</strong>を取得します</li>
                                <li>昇格はいつでも実行できます</li>
                            </>
                        ) : (
                            <>
                                <li>この操作は<strong className="text-danger">90日に1回</strong>のみ実行できます</li>
                                <li>このユーザーは教員権限を失います</li>
                                <li>元に戻すには再度昇格が必要です</li>
                            </>
                        )}
                    </ul>
                </div>

                <p className="confirm-text">本当に実行しますか？</p>

                <div className="modal-actions">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>
                        キャンセル
                    </Button>
                    <Button
                        variant={isPromotion ? 'primary' : 'danger'}
                        onClick={onConfirm}
                        loading={loading}
                    >
                        {actionText}を実行する
                    </Button>
                </div>
            </div>
        </div>
    );
};

const AdminUsersPage: React.FC = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuthStore();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'student' | 'employee' | 'teacher'>('all');
    const [search, setSearch] = useState('');

    // モーダル用
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [targetRole, setTargetRole] = useState<'student' | 'employee' | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const loadUsers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const filters: { role?: string; search?: string } = {};
            if (filter !== 'all') {
                filters.role = filter;
            }
            if (search.trim()) {
                filters.search = search.trim();
            }

            const response = await attendanceApi.getAdminUsers(filters);

            if (response.success && response.data) {
                setUsers(response.data.users || []);
            } else {
                setError(response.message || 'ユーザー一覧の取得に失敗しました');
            }
        } catch (err: any) {
            setError(err.message || 'ユーザー一覧の取得中にエラーが発生しました');
        } finally {
            setLoading(false);
        }
    }, [filter, search]);

    useEffect(() => {
        if (currentUser?.role === 'admin' || currentUser?.role === 'owner') {
            loadUsers();
        } else {
            setError('この画面へのアクセス権限がありません');
            setLoading(false);
        }
    }, [currentUser, loadUsers]);

    const handleRoleChange = async () => {
        if (!selectedUser || !targetRole) return;

        try {
            setActionLoading(true);
            const response = await attendanceApi.updateUserRole(selectedUser.id, targetRole);

            if (response.success) {
                setSuccessMessage(response.message || `${selectedUser.name}さんの役割を変更しました`);
                setSelectedUser(null);
                setTargetRole(null);
                loadUsers();

                // 成功メッセージを3秒後に消す
                setTimeout(() => setSuccessMessage(null), 3000);
            } else {
                setError(response.message || '役割の変更に失敗しました');
            }
        } catch (err: any) {
            setError(err.message || '役割の変更中にエラーが発生しました');
        } finally {
            setActionLoading(false);
        }
    };

    const openRoleChangeModal = (user: User, newRole: 'student' | 'employee') => {
        setSelectedUser(user);
        setTargetRole(newRole);
    };

    const getRoleDisplayName = (role: string): string => {
        const map: Record<string, string> = {
            student: '生徒',
            employee: '教員',
            teacher: '教員',
            admin: '管理者',
            owner: 'オーナー',
        };
        return map[role] || role;
    };

    const getRoleBadgeClass = (role: string): string => {
        switch (role) {
            case 'admin':
            case 'owner':
                return 'badge--admin';
            case 'teacher':
            case 'employee':
                return 'badge--teacher';
            case 'student':
            default:
                return 'badge--student';
        }
    };

    if (loading && users.length === 0) {
        return (
            <div className="admin-users-page">
                <div className="loading-container">
                    <div className="spinner" />
                    <p>ユーザー一覧を読み込んでいます...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-users-page">
            <div className="page-header">
                <div className="header-left">
                    <Button variant="secondary" onClick={() => navigate(-1)}>
                        ← 戻る
                    </Button>
                    <div className="header-titles">
                        <h1>ユーザー管理</h1>
                        <p className="subtitle">ユーザーの役割を管理します</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="error-banner">
                    <span>⚠️ {error}</span>
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            {successMessage && (
                <div className="success-banner">
                    <span>✅ {successMessage}</span>
                </div>
            )}

            {/* フィルター */}
            <div className="filters-section">
                <div className="filter-buttons">
                    <button
                        className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        全員
                    </button>
                    <button
                        className={`filter-btn ${filter === 'student' ? 'active' : ''}`}
                        onClick={() => setFilter('student')}
                    >
                        生徒のみ
                    </button>
                    <button
                        className={`filter-btn ${filter === 'employee' || filter === 'teacher' ? 'active' : ''}`}
                        onClick={() => setFilter('employee')}
                    >
                        教員のみ
                    </button>
                </div>
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="名前・メール・学生IDで検索..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                    />
                    <Button variant="primary" onClick={loadUsers}>検索</Button>
                </div>
            </div>

            {/* ユーザー一覧 */}
            <div className="users-table-container">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>名前</th>
                            <th>メール</th>
                            <th>役割</th>
                            <th>学生ID</th>
                            <th>登録日</th>
                            <th>アクション</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="empty-row">
                                    ユーザーが見つかりません
                                </td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user.id}>
                                    <td className="user-name">{user.name}</td>
                                    <td className="user-email">{user.email}</td>
                                    <td>
                                        <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                                            {getRoleDisplayName(user.role)}
                                        </span>
                                    </td>
                                    <td>{user.student_id || '-'}</td>
                                    <td>{new Date(user.created_at).toLocaleDateString('ja-JP')}</td>
                                    <td className="actions-cell">
                                        {/* 自分自身は変更不可 */}
                                        {user.id === currentUser?.id ? (
                                            <span className="text-muted">（自分）</span>
                                        ) : user.role === 'admin' || user.role === 'owner' ? (
                                            <span className="text-muted">変更不可</span>
                                        ) : user.role === 'student' ? (
                                            <Button
                                                variant="primary"
                                                size="small"
                                                onClick={() => openRoleChangeModal(user, 'employee')}
                                            >
                                                教員に昇格
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="danger"
                                                size="small"
                                                onClick={() => openRoleChangeModal(user, 'student')}
                                                disabled={!user.canDemote}
                                                title={!user.canDemote ? `次回変更可能: ${user.nextDemoteDate}` : undefined}
                                            >
                                                {user.canDemote ? '生徒に降格' : `${user.nextDemoteDate}以降`}
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* 役割変更モーダル */}
            {selectedUser && targetRole && (
                <RoleChangeModal
                    user={selectedUser}
                    newRole={targetRole}
                    onClose={() => {
                        setSelectedUser(null);
                        setTargetRole(null);
                    }}
                    onConfirm={handleRoleChange}
                    loading={actionLoading}
                />
            )}
        </div>
    );
};

export default AdminUsersPage;
