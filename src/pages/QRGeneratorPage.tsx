import React, { useState, useEffect, useCallback } from 'react';
import { securityApi } from '../api';
import useAuthStore from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import QRGenerator from '../components/common/QRGenerator';
import './QRGeneratorPage.css';

interface QRCode {
  id: number;
  location_name: string;
  description?: string;
  location_description?: string;
  qr_image?: string;
  qr_code?: string;
  code?: string;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
  [key: string]: any;
}

interface QRFormData {
  locationName: string;
  description: string;
  expiresAt: string;
}

/**
 * QRコード生成ページ（管理者専用）
 */
const QRGeneratorPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedQR, setGeneratedQR] = useState<QRCode | null>(null);
  const [qrHistory, setQRHistory] = useState<QRCode[]>([]);

  // モーダル表示用State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedQR, setSelectedQR] = useState<QRCode | null>(null);

  // フォームデータ
  const [formData, setFormData] = useState<QRFormData>({
    locationName: '',
    description: '',
    expiresAt: '',
  });

  // 学生（student）はアクセス不可
  const allowedRoles = ['owner', 'admin', 'teacher', 'employee'];
  const canAccess = user ? allowedRoles.includes(user.role) : false;

  // 権限チェック - 学生の場合は即座にリダイレクト
  useEffect(() => {
    if (user && !canAccess) {
      console.warn('[QRGeneratorPage] 学生はQRコード生成ページにアクセスできません');
      navigate('/dashboard', { replace: true });
    }
  }, [user, canAccess, navigate]);

  // QRコード履歴取得（改善版）
  const fetchQRHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await securityApi.getQRCodes({ limit: 10 });

      // レスポンス形式に応じた処理
      if (response && response.success && Array.isArray(response.data)) {
        setQRHistory(response.data as unknown as QRCode[]);
      } else if (response && Array.isArray(response.data)) {
        setQRHistory(response.data as unknown as QRCode[]);
      } else if (Array.isArray(response)) {
        setQRHistory(response as unknown as QRCode[]);
      } else {
        console.warn('予期しないレスポンス形式:', response);
        setQRHistory([]);
      }
    } catch (err: any) {
      console.error('QR履歴取得エラー:', err);
      setError('QR履歴の取得に失敗しました');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    // 権限がある場合のみQRコード履歴を取得
    if (canAccess) {
      fetchQRHistory();
    }
  }, [canAccess, fetchQRHistory]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenerateQR = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.locationName) {
      setError('場所名は必須です');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await securityApi.generateLocationQR({
        locationName: formData.locationName,
        locationDescription: formData.description,
        expiresAt: formData.expiresAt || null,
      });

      if (response.success) {
        setGeneratedQR(response.data as unknown as QRCode);
        setFormData({
          locationName: '',
          description: '',
          expiresAt: '',
        });
        // 履歴を確実に更新
        await fetchQRHistory();
      } else {
        setError(response.message || 'QRコードの生成に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || 'QRコードの生成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQR = () => {
    if (!generatedQR || !generatedQR.qr_image) return;

    const link = document.createElement('a');
    link.href = generatedQR.qr_image;
    link.download = `QR_${generatedQR.location_name}_${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintQR = () => {
    if (!generatedQR || !generatedQR.qr_image) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${generatedQR.location_name} - QRコード</title>
          <style>
            body { 
              font-family: sans-serif; 
              text-align: center; 
              padding: 40px; 
            }
            img { 
              max-width: 300px; 
              margin: 20px 0; 
            }
            h1 { margin-bottom: 30px; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <h1>${generatedQR.location_name}</h1>
          ${generatedQR.description ? `<p>${generatedQR.description}</p>` : ''}
          <img src="${generatedQR.qr_image}" alt="QRコード" />
          <p>生成日時: ${new Date(generatedQR.created_at).toLocaleString('ja-JP')}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDeactivateQR = async (qrId: number) => {
    if (!window.confirm('このQRコードを無効化しますか？')) {
      return;
    }

    try {
      const response = await securityApi.deactivateQRCode(qrId);
      if (response.success) {
        await fetchQRHistory();
        if (generatedQR && generatedQR.id === qrId) {
          setGeneratedQR(null);
        }
      } else {
        setError(response.message || '無効化に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || '無効化に失敗しました');
    }
  };

  // モーダルを開く
  const handleShowQR = (qr: QRCode) => {
    setSelectedQR(qr);
    setShowModal(true);
    // スクロール無効化
    document.body.style.overflow = 'hidden';
  };

  // モーダルを閉じる
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedQR(null);
    // スクロール復元
    document.body.style.overflow = '';
  };

  // モーダルオーバーレイクリック時
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseModal();
    }
  };

  return (
    <div className="qr-generator-page">
      <div className="qr-generator-container">
        <div className="page-header">
          <h1>QRコード生成</h1>
          <p className="page-subtitle">
            場所ベースのQRコードを生成・管理します
          </p>
        </div>

        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        <div className={`qr-content ${generatedQR ? 'has-generated' : ''}`}>
          {/* QR生成フォーム */}
          <div className="qr-form-section">
            <h2>新規QRコード生成</h2>
            <form onSubmit={handleGenerateQR} className="qr-form">
              <div className="form-group">
                <label htmlFor="locationName">場所名 *</label>
                <input
                  type="text"
                  id="locationName"
                  maxLength={64}
                  name="locationName"
                  value={formData.locationName}
                  onChange={handleInputChange}
                  placeholder="例: 第1教室、体育館"
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">説明</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="QRコードの用途や注意事項"
                  rows={3}
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <label htmlFor="expiresAt">有効期限（オプション）</label>
                <input
                  type="datetime-local"
                  id="expiresAt"
                  name="expiresAt"
                  value={formData.expiresAt}
                  onChange={handleInputChange}
                  className="form-input"
                />
                <small className="form-hint">
                  未設定の場合、無期限で有効です
                </small>
              </div>

              <button
                type="submit"
                className="btn btn--primary btn--large"
                disabled={loading}
              >
                {loading ? '生成中...' : 'QRコード生成'}
              </button>
            </form>
          </div>

          {/* 生成されたQR表示 */}
          {generatedQR && (
            <div className="qr-display-section">
              <h2>生成されたQRコード</h2>
              <div className="qr-display-card">
                <div className="qr-image-container">
                  {generatedQR.qr_image ? (
                    <img
                      src={generatedQR.qr_image}
                      alt="生成されたQRコード"
                      className="qr-image"
                    />
                  ) : (
                    <div className="qr-placeholder">QR画像なし</div>
                  )}
                </div>

                <div className="qr-info">
                  <h3>{generatedQR.location_name}</h3>
                  {generatedQR.description && (
                    <p className="qr-description">{generatedQR.description}</p>
                  )}
                  <div className="qr-meta">
                    <span className="qr-code-text">
                      コード: {generatedQR.qr_code}
                    </span>
                    <span
                      className={`qr - status ${generatedQR.is_active ? 'active' : 'inactive'}`}
                    >
                      {generatedQR.is_active ? '有効' : '無効'}
                    </span>
                  </div>
                  {generatedQR.expires_at && (
                    <p className="qr-expiry">
                      有効期限:{' '}
                      {new Date(generatedQR.expires_at).toLocaleString('ja-JP')}
                    </p>
                  )}
                </div>

                <div className="qr-actions">
                  <button
                    className="btn btn--primary"
                    onClick={handleDownloadQR}
                  >
                    📥 ダウンロード
                  </button>
                  <button
                    className="btn btn--secondary"
                    onClick={handlePrintQR}
                  >
                    🖨️ 印刷
                  </button>
                  <button
                    className="btn btn--danger"
                    onClick={() => handleDeactivateQR(generatedQR.id)}
                  >
                    🚫 無効化
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* QRコード履歴 */}
          <div className="qr-history-section">
            <h2>最近のQRコード</h2>
            {historyLoading ? (
              <div className="loading-state">
                <p>読み込み中...</p>
              </div>
            ) : qrHistory.length === 0 ? (
              <div className="empty-state">
                <p>まだQRコードがありません</p>
              </div>
            ) : (
              <div className="qr-history-list">
                {qrHistory.map((qr) => (
                  <div key={qr.id} className="qr-history-item">
                    <div className="qr-history-info">
                      <h4>{qr.location_name}</h4>
                      <p className="qr-history-date">
                        生成:{' '}
                        {new Date(qr.created_at).toLocaleDateString('ja-JP')}
                      </p>
                      {qr.description && (
                        <p className="qr-history-desc">{qr.description}</p>
                      )}
                    </div>
                    <div className="qr-history-actions">
                      {/* QR表示ボタン追加 */}
                      <button
                        className="btn btn--sm btn--view"
                        onClick={() => handleShowQR(qr)}
                        aria-label={`${qr.location_name}のQRコードを表示`}
                      >
                        👁️ 表示
                      </button>
                      <span
                        className={`status - badge ${qr.is_active ? 'active' : 'inactive'}`}
                      >
                        {qr.is_active ? '有効' : '無効'}
                      </span>
                      {qr.is_active && (
                        <button
                          className="btn btn--sm btn--danger"
                          onClick={() => handleDeactivateQR(qr.id)}
                        >
                          無効化
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QRコード表示モーダル */}
      {showModal && selectedQR && (
        <div
          className="qr-modal-overlay"
          onClick={handleOverlayClick}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCloseModal();
          }}
          role="presentation"
        >
          <div
            className="qr-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-modal-title"
          >
            <div className="qr-modal-header">
              <h2 id="qr-modal-title">QRコード表示</h2>
              <button
                type="button"
                className="qr-modal-close"
                onClick={handleCloseModal}
                aria-label="モーダルを閉じる"
              >
                ×
              </button>
            </div>
            <div className="qr-modal-content">
              <QRGenerator
                qrImage={selectedQR.qr_image}
                qrCode={selectedQR.qr_code || selectedQR.code}
                locationName={selectedQR.location_name}
                description={selectedQR.description || selectedQR.location_description}
                expiresAt={selectedQR.expires_at}
                onClose={handleCloseModal}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRGeneratorPage;
