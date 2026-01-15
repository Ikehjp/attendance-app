import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import { ipSettingsApi, IpRange } from '../api/ipSettingsApi';
import Button from '../components/common/Button';
import './IPSettingsPage.css';

interface IpRangeFormModalProps {
    initialData?: IpRange | null;
    onClose: () => void;
    onSave: (data: Omit<IpRange, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
    loading: boolean;
}

const IpRangeFormModal: React.FC<IpRangeFormModalProps> = ({ initialData, onClose, onSave, loading }) => {
    const [formData, setFormData] = useState({
        name: '',
        ip_start: '',
        ip_end: '',
        description: '',
        is_active: true,
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                ip_start: initialData.ip_start,
                ip_end: initialData.ip_end,
                description: initialData.description || '',
                is_active: initialData.is_active,
            });
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        // チェックボックスの場合
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content ip-settings-modal" onClick={(e) => e.stopPropagation()}>
                <h2>{initialData ? 'IP範囲を編集' : '新しいIP範囲を追加'}</h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="name">設定名 <span className="required">*</span></label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="例: 学校Wi-Fi, 〇〇キャンパス"
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="ip_start">開始IPアドレス <span className="required">*</span></label>
                            <input
                                type="text"
                                id="ip_start"
                                name="ip_start"
                                value={formData.ip_start}
                                onChange={handleChange}
                                placeholder="例: 192.168.1.1"
                                required
                                pattern="^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
                                title="正しいIPv4アドレス形式で入力してください"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="ip_end">終了IPアドレス <span className="required">*</span></label>
                            <input
                                type="text"
                                id="ip_end"
                                name="ip_end"
                                value={formData.ip_end}
                                onChange={handleChange}
                                placeholder="例: 192.168.1.255"
                                required
                                pattern="^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
                                title="正しいIPv4アドレス形式で入力してください"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">説明</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="このIP範囲の説明を入力してください"
                            rows={3}
                        />
                    </div>

                    <div className="form-group checkbox-group">
                        <input
                            type="checkbox"
                            id="is_active"
                            name="is_active"
                            checked={formData.is_active}
                            onChange={handleChange}
                        />
                        <label htmlFor="is_active">この設定を有効にする</label>
                    </div>

                    <div className="modal-actions">
                        <Button variant="secondary" onClick={onClose} disabled={loading} type="button">
                            キャンセル
                        </Button>
                        <Button variant="primary" type="submit" loading={loading}>
                            保存
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const IPSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuthStore();
    const [ipRanges, setIpRanges] = useState<IpRange[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // モーダル用
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<IpRange | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const loadIpRanges = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await ipSettingsApi.getAll();

            if (response.success && response.data) {
                setIpRanges(response.data);
            } else {
                setError(response.message || 'IP範囲設定の取得に失敗しました');
            }
        } catch (err: any) {
            setError(err.message || 'IP範囲設定の取得中にエラーが発生しました');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (currentUser?.role === 'admin' || currentUser?.role === 'owner') {
            loadIpRanges();
        } else {
            setError('この画面へのアクセス権限がありません');
            setLoading(false);
        }
    }, [currentUser, loadIpRanges]);

    const handleSave = async (data: Omit<IpRange, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            setActionLoading(true);
            let response;

            if (editingItem) {
                response = await ipSettingsApi.update(editingItem.id, data);
                setSuccessMessage('IP範囲設定を更新しました');
            } else {
                response = await ipSettingsApi.create(data);
                setSuccessMessage('新しいIP範囲を追加しました');
            }

            if (response.success) {
                setShowModal(false);
                setEditingItem(null);
                loadIpRanges();
                setTimeout(() => setSuccessMessage(null), 3000);
            } else {
                setError(response.message || '保存に失敗しました');
            }
        } catch (err: any) {
            setError(err.message || '保存中にエラーが発生しました');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('このIP範囲設定を削除してもよろしいですか？')) return;

        try {
            setActionLoading(true);
            const response = await ipSettingsApi.delete(id);

            if (response.success) {
                setSuccessMessage('IP範囲設定を削除しました');
                loadIpRanges();
                setTimeout(() => setSuccessMessage(null), 3000);
            } else {
                setError(response.message || '削除に失敗しました');
            }
        } catch (err: any) {
            setError(err.message || '削除中にエラーが発生しました');
        } finally {
            setActionLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setEditingItem(null);
        setShowModal(true);
    };

    const handleOpenEdit = (item: IpRange) => {
        setEditingItem(item);
        setShowModal(true);
    };

    if (loading && ipRanges.length === 0) {
        return (
            <div className="ip-settings-page">
                <div className="loading-container">
                    <div className="spinner" />
                    <p>読み込み中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="ip-settings-page">
            <div className="page-header">
                <div className="header-left">
                    <Button variant="secondary" onClick={() => navigate(-1)}>
                        ← 戻る
                    </Button>
                    <div className="header-titles">
                        <h1>IP範囲設定</h1>
                        <p className="subtitle">出欠打刻やアクセスを許可するIPアドレス範囲を管理します</p>
                    </div>
                </div>
                <Button variant="primary" onClick={handleOpenCreate}>
                    + 新規追加
                </Button>
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

            <div className="ip-ranges-list">
                {ipRanges.length === 0 ? (
                    <div className="empty-state">
                        <p>設定されているIP範囲はありません</p>
                        <Button variant="secondary" onClick={handleOpenCreate}>
                            最初の設定を追加
                        </Button>
                    </div>
                ) : (
                    <div className="grid-container">
                        {ipRanges.map(range => (
                            <div key={range.id} className={`ip-range-card ${!range.is_active ? 'inactive' : ''}`}>
                                <div className="card-header">
                                    <h3>{range.name}</h3>
                                    <span className={`status-badge ${range.is_active ? 'active' : 'inactive'}`}>
                                        {range.is_active ? '有効' : '無効'}
                                    </span>
                                </div>

                                <div className="card-body">
                                    <div className="ip-info">
                                        <div className="ip-row">
                                            <span className="label">開始:</span>
                                            <span className="value monospace">{range.ip_start}</span>
                                        </div>
                                        <div className="ip-row">
                                            <span className="label">終了:</span>
                                            <span className="value monospace">{range.ip_end}</span>
                                        </div>
                                    </div>

                                    {range.description && (
                                        <p className="description">{range.description}</p>
                                    )}
                                </div>

                                <div className="card-actions">
                                    <Button variant="secondary" size="small" onClick={() => handleOpenEdit(range)}>
                                        編集
                                    </Button>
                                    <Button variant="danger" size="small" onClick={() => handleDelete(range.id)}>
                                        削除
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <IpRangeFormModal
                    initialData={editingItem}
                    onClose={() => setShowModal(false)}
                    onSave={handleSave}
                    loading={actionLoading}
                />
            )}
        </div>
    );
};

export default IPSettingsPage;
