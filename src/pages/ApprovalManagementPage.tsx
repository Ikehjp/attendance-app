import React, { useState, useEffect } from 'react';
import useAuthStore from '../stores/authStore';
import { absenceRequestApi } from '../api';
import Button from '../components/common/Button';
import './ApprovalManagementPage.css';

interface Request {
  id: number;
  student_name: string;
  type: string;
  reason: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  request_type?: string;
  request_date?: string;
  attachment_path?: string;
  approval_comment?: string;
  [key: string]: any;
}

const ApprovalManagementPage: React.FC = () => {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [comment, setComment] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const status = filter === 'all' ? undefined : filter; // Fixed: filter is used directly if not 'all'
      // Note: API might expect 'status' as 'pending' | 'approved' | 'rejected'. 
      // If 'all', we pass undefined to get all.
      // If 'pending', we get pending.
      // The original code had logic trying to filter on client side if filter was 'pending' ??
      // Let's rely on API or client filtering.
      // absenceRequestApi.getAllRequests takes { status }.

      const response = await absenceRequestApi.getAllRequests({ status: filter === 'all' ? undefined : filter });

      if (response.success) {
        setRequests(response.data as unknown as Request[]);
      } else {
        setError(response.message || '申請一覧の取得に失敗しました');
      }
    } catch (err: any) {
      console.error('取得エラー:', err);
      setError('申請一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: number) => {
    try {
      const response = await absenceRequestApi.approveRequest(requestId, comment);
      if (response.success) {
        setSuccess('申請を承認しました');
        setSelectedRequest(null);
        setComment('');
        fetchRequests();
      } else {
        setError(response.message || '承認に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || '承認に失敗しました');
    }
  };

  const handleReject = async (requestId: number) => {
    if (!comment) {
      setError('却下の理由を入力してください');
      return;
    }

    try {
      const response = await absenceRequestApi.rejectRequest(requestId, comment);
      if (response.success) {
        setSuccess('申請を却下しました');
        setSelectedRequest(null);
        setComment('');
        fetchRequests();
      } else {
        setError(response.message || '却下に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || '却下に失敗しました');
    }
  };

  const handleUpdateStatus = async (id: number, status: 'approved' | 'rejected') => {
    if (!window.confirm(`${status === 'approved' ? '承認' : '却下'} しますか？`)) {
      return;
    }

    try {
      setProcessingId(id);
      // Assuming updateStatus exists or using approve/reject shortcuts
      // The original code used updateStatus, checking api..
      // absenceRequestApi usually has approveRequest/rejectRequest.
      // If updateStatus is not available, we map it.
      // Checking previous file content... it called absenceRequestApi.updateStatus(id, status).
      // If that exists, good. If not, we use approve/reject.
      // But let's assume it exists or I should use approve/reject logic.
      // Ideally I should reuse handleApprove/handleReject logic but they take requestId and use 'comment' state.
      // Here we might be calling it from the list directly (if button exists there? no, it's inside modal).
      // Wait, the modal has buttons calling these.
      // BUT `handleUpdateStatus` calls `absenceRequestApi.updateStatus`.
      // I'll assume `absenceRequestApi.updateStatus` is valid or replace with conditional calls.

      let response;
      if (status === 'approved') {
        response = await absenceRequestApi.approveRequest(id, comment);
      } else {
        response = await absenceRequestApi.rejectRequest(id, comment);
      }

      if (response.success) {
        // リストを更新
        setRequests(prev => prev.map(req =>
          req.id === id ? { ...req, status } : req,
        ));

        // フィルタがpendingの場合はリストから除外
        if (filter === 'pending') {
          setRequests(prev => prev.filter(req => req.id !== id));
        }

        setSuccess(`申請を${status === 'approved' ? '承認' : '却下'}しました`);
        setSelectedRequest(null);
        setComment('');
      } else {
        alert(response.message || '更新に失敗しました');
      }
    } catch (err: any) {
      console.error('更新エラー:', err);
      alert('更新中にエラーが発生しました');
    } finally {
      setProcessingId(null);
    }
  };

  // 通知を3秒後に自動消去
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const getRequestTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      absence: '欠席届',
      official_absence: '公欠届',
      official_late: '公遅刻届',
      'early_departure': '早退届', // quoted key for consistency
      late: '遅刻届',
      early_leave: '早退届',
      other: 'その他',
    };
    return typeMap[type] || type;
  };

  return (
    <div className="approval-page">
      {/* トースト通知 */}
      <div className="toast-container">
        {success && (
          <div className="toast toast--success">
            <span className="toast-icon">✓</span>
            <span className="toast-message">{success}</span>
            <button className="toast-close" onClick={() => setSuccess(null)}>×</button>
          </div>
        )}
        {error && (
          <div className="toast toast--error">
            <span className="toast-icon">⚠️</span>
            <span className="toast-message">{error}</span>
            <button className="toast-close" onClick={() => setError(null)}>×</button>
          </div>
        )}
      </div>

      <div className="approval-container">
        <div className="page-header">
          <h1>承認管理</h1>
          <p className="page-subtitle">学生からの申請を承認・却下します</p>
        </div>

        <div className="filter-bar">
          <button className={`filter-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>承認待ち</button>
          <button className={`filter-btn ${filter === 'approved' ? 'active' : ''}`} onClick={() => setFilter('approved')}>承認済み</button>
          <button className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`} onClick={() => setFilter('rejected')}>却下</button>
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>すべて</button>
        </div>

        {loading ? (
          <div className="loading-state">読み込み中...</div>
        ) : requests.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📭</div><p>申請がありません</p></div>
        ) : (
          <div className="request-grid">
            {requests.map(request => (
              <div key={request.id} className="approval-card">
                <div className="approval-card-header">
                  <div>
                    <h3>{request.student_name || request.student_id}</h3>
                    <span className="request-type-badge">{getRequestTypeLabel(request.request_type || request.type)}</span>
                  </div>
                  <span className="request-date">{new Date(request.request_date || request.start_date).toLocaleDateString('ja-JP')}</span>
                </div>
                <div className="approval-card-body">
                  <p className="request-reason">{request.reason}</p>
                  {request.attachment_path && <div className="attachment-badge">📎 添付ファイルあり</div>}
                </div>
                {request.status === 'pending' ? (
                  <div className="approval-card-actions">
                    <button className="btn btn--success" onClick={() => setSelectedRequest(request)}>承認/却下</button>
                  </div>
                ) : (
                  <div className="approval-card-footer">
                    <span className={`badge status-${request.status}`}>{request.status === 'approved' ? '承認済み' : '却下'}</span>
                    {request.approval_comment && <p className="approval-comment">コメント: {request.approval_comment}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>申請の承認/却下</h2>
              <button className="modal-close" onClick={() => setSelectedRequest(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="request-detail">
                <p><strong>学生:</strong> {selectedRequest.student_name || selectedRequest.student_id}</p>
                <p><strong>種別:</strong> {getRequestTypeLabel(selectedRequest.request_type || selectedRequest.type)}</p>
                <p><strong>日付:</strong> {new Date(selectedRequest.request_date || selectedRequest.start_date).toLocaleDateString('ja-JP')}</p>
                <p><strong>理由:</strong> {selectedRequest.reason}</p>
              </div>
              <div className="form-group">
                <label htmlFor="approvalComment">コメント（承認時は任意、却下時は必須）</label>
                {selectedRequest.status === 'pending' && (
                  <div className="action-buttons">
                    <Button
                      size="small"
                      variant="primary"
                      onClick={() => handleUpdateStatus(selectedRequest.id, 'approved')}
                      disabled={processingId === selectedRequest.id}
                    >
                      承認
                    </Button>
                    <Button
                      size="small"
                      variant="danger"
                      onClick={() => handleUpdateStatus(selectedRequest.id, 'rejected')}
                      disabled={processingId === selectedRequest.id}
                    >
                      却下
                    </Button>
                  </div>
                )}
                <textarea
                  id="approvalComment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  rows={4}
                  className="form-textarea"
                  placeholder="コメントを入力..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn--secondary" onClick={() => setSelectedRequest(null)}>キャンセル</button>
              {/* Note: buttons below call handleReject/handleApprove which use 'comment' state. Same as handleUpdateStatus calls above if clicked. 
                  But these buttons are at footer, separate from the 'action-buttons' inside the form-group?
                  The UI seems to have redundant buttons or different layout. Keeping both for now but ensuring they work.
              */}
              <button className="btn btn--danger" onClick={() => handleReject(selectedRequest.id)}>却下</button>
              <button className="btn btn--success" onClick={() => handleApprove(selectedRequest.id)}>承認</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalManagementPage;
