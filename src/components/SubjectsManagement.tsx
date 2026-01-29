import React, { useState, useEffect } from 'react';
import { subjectApi } from '../api';
import './SubjectsManagement.css';

interface Subject {
    id: number;
    subject_code: string;
    subject_name: string;
    description?: string;
    credits?: number;
    is_active?: boolean;
}

const SubjectsManagement: React.FC = () => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [formData, setFormData] = useState({
        subject_code: '',
        subject_name: '',
        description: '',
        credits: 1,
    });

    useEffect(() => {
        loadSubjects();
    }, []);

    const loadSubjects = async () => {
        try {
            setLoading(true);
            const response = await subjectApi.getSubjects();
            if (response.success && response.data) {
                const data = response.data as any;
                setSubjects(data?.subjects || []);
            }
        } catch (err) {
            console.error('科目取得エラー:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'credits' ? Number(value) : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (editingSubject) {
                const response = await subjectApi.updateSubject(editingSubject.id, {
                    subject_code: formData.subject_code,
                    subject_name: formData.subject_name,
                    description: formData.description,
                    credits: formData.credits,
                });
                if (response.success) {
                    setSuccess('科目を更新しました');
                    resetForm();
                    loadSubjects();
                } else {
                    setError(response.message || '更新に失敗しました');
                }
            } else {
                const response = await subjectApi.createSubject({
                    subjectCode: formData.subject_code,
                    subjectName: formData.subject_name,
                    description: formData.description,
                    credits: formData.credits,
                });
                if (response.success) {
                    setSuccess('科目を作成しました');
                    resetForm();
                    loadSubjects();
                } else {
                    setError(response.message || '作成に失敗しました');
                }
            }
        } catch (err: any) {
            setError(err.message || '操作に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (subject: Subject) => {
        setEditingSubject(subject);
        setFormData({
            subject_code: subject.subject_code,
            subject_name: subject.subject_name,
            description: subject.description || '',
            credits: subject.credits || 1,
        });
        setShowForm(true);
    };

    const handleDelete = async (subjectId: number) => {
        if (!window.confirm('この科目を削除しますか？')) return;

        setLoading(true);
        try {
            const response = await subjectApi.deleteSubject(subjectId);
            if (response.success) {
                setSuccess('科目を削除しました');
                loadSubjects();
            } else {
                setError(response.message || '削除に失敗しました');
            }
        } catch (err: any) {
            setError(err.message || '削除に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            subject_code: '',
            subject_name: '',
            description: '',
            credits: 1,
        });
        setEditingSubject(null);
        setShowForm(false);
    };

    return (
        <div className="subjects-management">
            <div className="subjects-header">
                <h2>📚 科目管理</h2>
                <button className="btn btn--primary" onClick={() => setShowForm(true)}>
                    ＋ 新規科目
                </button>
            </div>

            {error && (
                <div className="alert alert--error">
                    <span>⚠️ {error}</span>
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}
            {success && (
                <div className="alert alert--success">
                    <span>✓ {success}</span>
                    <button onClick={() => setSuccess(null)}>×</button>
                </div>
            )}

            {showForm && (
                <div className="subject-form-container">
                    <form onSubmit={handleSubmit} className="subject-form">
                        <h3>{editingSubject ? '科目を編集' : '新規科目を追加'}</h3>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="subject_code">科目コード *</label>
                                <input
                                    id="subject_code"
                                    name="subject_code"
                                    type="text"
                                    value={formData.subject_code}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="例: MATH101"
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="subject_name">科目名 *</label>
                                <input
                                    id="subject_name"
                                    name="subject_name"
                                    type="text"
                                    value={formData.subject_name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="例: 数学I"
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="credits">単位数</label>
                                <input
                                    id="credits"
                                    name="credits"
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={formData.credits}
                                    onChange={handleInputChange}
                                    className="form-input"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="description">説明（任意）</label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="科目の説明を入力..."
                                className="form-textarea"
                                rows={2}
                            />
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn btn--secondary" onClick={resetForm}>
                                キャンセル
                            </button>
                            <button type="submit" className="btn btn--primary" disabled={loading}>
                                {loading ? '保存中...' : (editingSubject ? '更新' : '作成')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading && !showForm ? (
                <div className="loading-state">読み込み中...</div>
            ) : subjects.length === 0 ? (
                <div className="empty-state">
                    <p>科目がまだ登録されていません。</p>
                    <p>「新規科目」ボタンから追加してください。</p>
                </div>
            ) : (
                <div className="subjects-table-container">
                    <table className="subjects-table">
                        <thead>
                            <tr>
                                <th>コード</th>
                                <th>科目名</th>
                                <th>説明</th>
                                <th>単位</th>
                                <th>状態</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subjects.map(subject => (
                                <tr key={subject.id}>
                                    <td><code>{subject.subject_code}</code></td>
                                    <td>{subject.subject_name}</td>
                                    <td className="description-cell">{subject.description || '-'}</td>
                                    <td>{subject.credits || 1}</td>
                                    <td>
                                        <span className={`status-badge ${subject.is_active !== false ? 'active' : 'inactive'}`}>
                                            {subject.is_active !== false ? '有効' : '無効'}
                                        </span>
                                    </td>
                                    <td className="actions-cell">
                                        <button
                                            className="btn btn--sm btn--secondary"
                                            onClick={() => handleEdit(subject)}
                                        >
                                            編集
                                        </button>
                                        <button
                                            className="btn btn--sm btn--danger"
                                            onClick={() => handleDelete(subject.id)}
                                        >
                                            削除
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default SubjectsManagement;
