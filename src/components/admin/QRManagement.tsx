import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { securityApi } from '../../api';
import QRGenerator from '../common/QRGenerator';
import './QRManagement.css';

interface Message {
  id: number | string;
  location_name: string;
  location_description?: string;
  expires_at?: string;
  created_by_name?: string;
  is_active: boolean;
  activeOnly?: boolean;
}

interface QRCodeItem {
  id: number | string;
  location_name: string;
  location_description: string;
  expires_at: string;
  created_by_name: string;
  is_active: boolean;
  created_at: string;
  qr_image?: string;
  qr_code?: string;
  code?: string; // API sometimes returns 'code'
  description?: string;
  locationName?: string; // For compatibility
}

interface FormData {
  locationName: string;
  locationDescription: string;
  expiresAt: string;
}

const QRManagement: React.FC = () => {
  const [qrCodes, setQrCodes] = useState<QRCodeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [generatedQR, setGeneratedQR] = useState<QRCodeItem | null>(null);
  const [viewingQR, setViewingQR] = useState<QRCodeItem | null>(null); // 表示用State

  // Form state
  const [formData, setFormData] = useState<FormData>({
    locationName: '',
    locationDescription: '',
    expiresAt: '',
  });

  useEffect(() => {
    fetchQRCodes();
  }, []);

  const fetchQRCodes = async() => {
    setLoading(true);
    try {
      const response = await securityApi.getQRCodes({ activeOnly: false });
      if (response.success) {
        setQrCodes(response.data);
      }
    } catch (err) {
      console.error('QR codes fetch error:', err);
      setError('QRコード一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreate = async(e: FormEvent) => {
    e.preventDefault();
    try {
      const response = await securityApi.generateLocationQR({
        locationName: formData.locationName,
        locationDescription: formData.locationDescription,
        expiresAt: formData.expiresAt || null,
      });

      if (response.success) {
        setGeneratedQR(response.data as QRCodeItem);
        setShowCreateModal(false);
        setFormData({ locationName: '', locationDescription: '', expiresAt: '' });
        fetchQRCodes(); // Refresh list
      }
    } catch (err: any) {
      console.error('QR create error:', err);
      alert('QRコードの作成に失敗しました: ' + (err.message || '不明なエラー'));
    }
  };

  const handleDeactivate = async(id: number | string) => {
    if (!window.confirm('このQRコードを無効化してもよろしいですか？')) return;
    try {
      await securityApi.deactivateQRCode(id);
      fetchQRCodes();
    } catch (err) {
      alert('無効化に失敗しました');
    }
  };

  const handleDelete = async(id: number | string) => {
    if (!window.confirm('このQRコードを削除してもよろしいですか？')) return;
    try {
      await securityApi.deleteQRCode(id);
      fetchQRCodes();
    } catch (err) {
      alert('削除に失敗しました');
    }
  };

  // 表示ボタンクリック時
  const handleView = (qr: QRCodeItem) => {
    setViewingQR(qr);
  };

  return (
    <div className="qr-management">
      <div className="section-header">
        <h2>場所QRコード管理</h2>
        <button
          className="btn btn--primary"
          onClick={() => setShowCreateModal(true)}
        >
          + 新規QR作成
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}

      {/* 生成されたQRコードの表示（モーダル） */}
      {generatedQR && (
        <div className="modal-overlay">
          <div className="modal-content">
            <QRGenerator
              qrImage={generatedQR.qr_image}
              qrCode={generatedQR.qr_code || generatedQR.code}
              locationName={generatedQR.location_name || generatedQR.locationName}
              description={generatedQR.description || generatedQR.location_description}
              onClose={() => setGeneratedQR(null)}
            />
          </div>
        </div>
      )}

      {/* QRコード表示モーダル */}
      {viewingQR && (
        <div className="modal-overlay">
          <div className="modal-content">
            <QRGenerator
              qrImage={viewingQR.qr_image}
              qrCode={viewingQR.code}
              locationName={viewingQR.location_name}
              description={viewingQR.location_description}
              expiresAt={viewingQR.expires_at}
              onClose={() => setViewingQR(null)}
            />
          </div>
        </div>
      )}

      {/* 作成モーダル */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>新規場所QRコード作成</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label htmlFor="locationName">場所名 (必須)</label>
                <input
                  id="locationName"
                  type="text"
                  name="locationName"
                  value={formData.locationName}
                  onChange={handleInputChange}
                  required
                  placeholder="例: 101教室"
                />
              </div>
              <div className="form-group">
                <label htmlFor="locationDescription">説明 (任意)</label>
                <textarea
                  id="locationDescription"
                  name="locationDescription"
                  value={formData.locationDescription}
                  onChange={handleInputChange}
                  placeholder="例: 正門入口付近"
                />
              </div>
              <div className="form-group">
                <label htmlFor="expiresAt">有効期限 (任意)</label>
                <input
                  id="expiresAt"
                  type="datetime-local"
                  name="expiresAt"
                  value={formData.expiresAt}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn--secondary">キャンセル</button>
                <button type="submit" className="btn btn--primary">作成</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 一覧表示 */}
      <div className="qr-list">
        {loading ? (
          <p>読み込み中...</p>
        ) : qrCodes.length === 0 ? (
          <p>QRコードがありません</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>場所名</th>
                <th>作成者</th>
                <th>状態</th>
                <th>作成日</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {qrCodes.map(qr => (
                <tr key={qr.id} className={!qr.is_active ? 'inactive-row' : ''}>
                  <td>
                    <div className="fw-bold">{qr.location_name}</div>
                    <div className="text-sm text-gray">{qr.location_description}</div>
                  </td>
                  <td>{qr.created_by_name || '不明'}</td>
                  <td>
                    <span className={`status-badge ${qr.is_active ? 'active' : 'inactive'}`}>
                      {qr.is_active ? '有効' : '無効'}
                    </span>
                  </td>
                  <td>{new Date(qr.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn btn--sm btn--view"
                        onClick={() => handleView(qr)}
                      >
                        表示
                      </button>
                      {qr.is_active && (
                        <button
                          className="btn btn--sm btn--warning"
                          onClick={() => handleDeactivate(qr.id)}
                        >
                          無効化
                        </button>
                      )}
                      <button
                        className="btn btn--sm btn--danger"
                        onClick={() => handleDelete(qr.id)}
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default QRManagement;

