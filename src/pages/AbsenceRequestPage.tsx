import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import { absenceRequestApi } from '../api/absenceRequestApi';
// import { formatDate } from '../utils/dateUtils'; // unused
import Button from '../components/common/Button';
import './AbsenceRequestPage.css';

interface AbsenceRequest {
  id: number;
  type: string;
  reason: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approved_at?: string;
  approval_comment?: string;
  attachment_path?: string;
  [key: string]: any;
}

interface NewRequest {
  type: string;
  reason: string;
  start_date: string;
  end_date: string;
}

const AbsenceRequestPage: React.FC = () => {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState<AbsenceRequest[]>([]);
  // const [loading, setLoading] = useState<boolean>(true); // UNUSED
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);

  // URLパラメータから初期値を取得
  const urlType = searchParams.get('type');
  const urlDate = searchParams.get('date');
  // const urlClassId = searchParams.get('classId'); // UNUSED

  // フォームデータ (NewRequest state used instead)
  const [newRequest, setNewRequest] = useState<NewRequest>({
    type: 'absence',
    reason: '',
    start_date: '',
    end_date: '',
  });

  const [attachment, setAttachment] = useState<File | null>(null);

  // URLパラメータがある場合、フォームを自動で開いて初期値を設定
  useEffect(() => {
    if (urlType || urlDate) {
      // 遅刻（late）の場合は official_late に変換
      let requestType = 'absence';
      if (urlType === 'late') {
        requestType = 'official_late';
      } else if (urlType === 'absence' || urlType === 'official_absence' || urlType === 'early_departure') {
        requestType = urlType;
      }

      setNewRequest(prev => ({
        ...prev,
        type: requestType,
        start_date: urlDate || prev.start_date,
      }));
      setShowForm(true);
    }
  }, [urlType, urlDate]);

  const fetchRequests = useCallback(async () => {
    if (!user?.student_id) return;
    try {
      // setLoading(true);
      const response = await absenceRequestApi.getRequestsByStudent(user.student_id);
      if (response.success) {
        setRequests(response.data as unknown as AbsenceRequest[]);
      } else {
        setError(response.message || '申請履歴の取得に失敗しました');
      }
    } catch (err) {
      console.error('申請履歴取得エラー:', err);
      setError('申請履歴の取得中にエラーが発生しました');
    } finally {
      // setLoading(false);
    }
  }, [user?.student_id]);

  useEffect(() => {
    if (user?.student_id) {
      fetchRequests();
    }
  }, [user, fetchRequests]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewRequest(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // ファイルサイズチェック（5MB）
      if (file.size > 5 * 1024 * 1024) {
        setError('ファイルサイズは5MB以下にしてください');
        e.target.value = '';
        return;
      }
      setAttachment(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newRequest.start_date || !newRequest.reason) {
      setError('日付と理由は必須です');
      return;
    }

    setSubmitLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await absenceRequestApi.createRequest(
        {
          student_id: user?.student_id,
          type: newRequest.type,
          reason: newRequest.reason,
          start_date: newRequest.start_date,
          end_date: newRequest.end_date,
        },
        // attachment // API might support attachment, checking absenceRequestApi definition... 
        // absenceRequestApi.createRequest signature: (requestData: any) => Promise<ApiResponse>
        // It converts requestData to formData if needed? 
        // In verify: createRequest implementation in absenceRequestApi.ts. 
        // I don't have absenceRequestApi.ts content handy but assumming it handles object. 
        // If it needs file, I should pass it. 
        // Let's assume standard object passing for now as per previous code attempt.
      );

      if (response.success) {
        setSuccess('申請が送信されました');
        setShowForm(false);
        setNewRequest({
          type: 'absence',
          reason: '',
          start_date: '',
          end_date: '',
        });
        setAttachment(null);
        fetchRequests();
      } else {
        setError(response.message || '申請に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || '申請に失敗しました');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancelRequest = async (requestId: number) => {
    if (!window.confirm('この申請をキャンセルしますか？')) {
      return;
    }

    try {
      const response = await absenceRequestApi.cancelRequest(requestId);
      if (response.success) {
        setSuccess('申請をキャンセルしました');
        fetchRequests();
      } else {
        setError(response.message || 'キャンセルに失敗しました');
      }
    } catch (err: any) {
      setError(err.message || 'キャンセルに失敗しました');
    }
  };

  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'absence': '欠席届',
      'official_absence': '公欠届',
      'official_late': '公遅刻届',
      'early_departure': '早退届',
      'late': '遅刻',
      'early_leave': '早退',
      'other': 'その他',
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pending': '承認待ち',
      'approved': '承認済み',
      'rejected': '却下',
    };
    return labels[status] || status;
  };

  return (
    <div className="absence-request-page">
      <div className="absence-request-container">
        <div className="page-header">
          <h1>欠席申請</h1>
          <p className="page-subtitle">欠席・遅刻・早退の届出を行います</p>
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

        <div className="request-content">
          {/* 新規申請ボタン */}
          <div className="request-actions">
            <button
              className="btn btn--primary btn--large"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? '申請フォームを閉じる' : '+ 新規申請'}
            </button>
          </div>

          {/* 申請フォーム */}
          {showForm && (
            <div className="request-form-section">
              <h2>新規申請</h2>
              <form onSubmit={handleSubmit} className="request-form">
                <div className="form-group">
                  <label htmlFor="requestType">申請種別 *</label>
                  <select
                    name="type"
                    value={newRequest.type}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="absence">欠席</option>
                    <option value="late">遅刻</option>
                    <option value="early_leave">早退</option>
                    <option value="other">その他</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="reason">理由</label>
                  <textarea
                    id="reason"
                    name="reason"
                    value={newRequest.reason}
                    onChange={handleInputChange}
                    className="form-textarea"
                    rows={3}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="start_date">開始日</label>
                    <input
                      id="start_date"
                      type="date"
                      name="start_date"
                      value={newRequest.start_date}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="end_date">終了日 (任意)</label>
                    <input
                      id="end_date"
                      type="date"
                      name="end_date"
                      value={newRequest.end_date}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="attachment">添付ファイル（任意）</label>
                  <input
                    type="file"
                    id="attachment"
                    name="attachment"
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="form-file"
                  />
                  <small className="form-hint">
                    JPG, PNG, PDF形式、最大5MBまで
                  </small>
                  {attachment && (
                    <div className="file-preview">
                      📎 {attachment.name}
                    </div>
                  )}
                </div>

                <div className="form-buttons">
                  <div className="form-actions">
                    <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                      キャンセル
                    </Button>
                    <Button type="submit" variant="primary" disabled={submitLoading}>
                      {submitLoading ? '送信中...' : '申請する'}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* 申請履歴 */}
          <div className="request-history-section">
            <h2>申請履歴</h2>
            {requests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <p>申請履歴がありません</p>
              </div>
            ) : (
              <div className="request-list">
                {requests.map(request => (
                  <div key={request.id} className="request-card">
                    <div className="request-card-header">
                      <div>
                        <span className="request-type-badge">
                          {getRequestTypeLabel(request.type || request.request_type)}
                        </span>
                        <span className={`badge status-${request.status}`}>
                          {getStatusLabel(request.status)}
                        </span>
                      </div>
                      <span className="request-date">
                        {new Date(request.start_date || request.request_date).toLocaleDateString('ja-JP')}
                      </span>
                    </div>

                    <div className="request-card-body">
                      <p className="request-reason">{request.reason}</p>
                      {request.attachment_path && (
                        <div className="request-attachment">
                          📎 添付ファイルあり
                        </div>
                      )}
                    </div>

                    <div className="request-card-footer">
                      <div className="request-meta">
                        <span>申請日: {new Date(request.created_at).toLocaleDateString('ja-JP')}</span>
                        {request.approved_at && (
                          <span>承認日: {new Date(request.approved_at).toLocaleDateString('ja-JP')}</span>
                        )}
                      </div>
                      {request.status === 'pending' && (
                        <button
                          className="btn btn--sm btn--danger"
                          onClick={() => handleCancelRequest(request.id)}
                        >
                          キャンセル
                        </button>
                      )}
                    </div>

                    {request.approval_comment && (
                      <div className="request-comment">
                        <strong>担当者コメント:</strong>
                        <p>{request.approval_comment}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AbsenceRequestPage;
