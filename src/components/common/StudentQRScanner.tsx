import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scanner, IDetectedBarcode } from '@yudiel/react-qr-scanner';
import './StudentQRScanner.css';

interface ScanResult {
  status?: string;
  message?: string;
  requiresSelection?: boolean;
  classes?: Array<{
    id: number | string;
    subject_name: string;
    class_code: string;
    start_time: string;
    end_time: string
  }>;
  logicalDate?: string;
  classId?: string | number;
}

interface StudentQRScannerProps {
  onScan: (data: { qrData: string }) => void;
  onClose: () => void;
  isOpen: boolean;
  scanResult?: ScanResult | null;
  onSelectClass: (classId: number | string) => void;
}

const StudentQRScanner: React.FC<StudentQRScannerProps> = ({ onScan, onClose, isOpen, scanResult, onSelectClass }) => {
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleScan = (detectedCodes: IDetectedBarcode[]) => {
    if (detectedCodes && detectedCodes.length > 0) {
      setIsScanning(false);
      try {
        const qrData = detectedCodes[0].rawValue.trim();
        // 学校固有のQRコードをそのまま渡す
        onScan({ qrData });
      } catch (err) {
        setError('QRコードの解析に失敗しました。正しいQRコードをスキャンしてください。');
        // 開発環境でのみエラーログ出力
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('QR解析エラー:', err);
        }
      }
    }
  };

  const handleError = (error: unknown) => {
    // 開発環境でのみエラーログ出力
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('QRスキャナーエラー:', error);
    }
    setError('カメラへのアクセスに失敗しました。カメラの許可を確認してください。');
  };

  const handleStartScan = () => {
    setError(null);
    setIsScanning(true);
  };

  const handleStopScan = () => {
    setIsScanning(false);
  };

  const handleCancelScan = () => {
    setError(null);
  };

  // 遅刻届を出す
  const handleLateRequest = () => {
    const classId = scanResult?.classId || '';
    const date = scanResult?.logicalDate || new Date().toISOString().split('T')[0];
    onClose();
    navigate(`/absence-request?type=late&classId=${classId}&date=${date}`);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="student-qr-scanner-overlay">
      <div className="student-qr-scanner-modal">
        <div className="student-qr-scanner-header">
          <h2>QRコードスキャン</h2>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className="student-qr-scanner-content">
          {error && (
            <div className="error-message">
              {error}
              <button
                className="retry-button"
                onClick={handleStartScan}
              >
                再試行
              </button>
            </div>
          )}

          {/* 遅刻判定の結果表示 */}
          {scanResult?.status === 'late' && (
            <div className="scan-result late-result">
              <div className="scan-result-icon late-icon">⏰</div>
              <h3>遅刻です</h3>
              <p className="scan-result-message">{scanResult.message}</p>
              <div className="late-actions">
                <p className="late-hint">遅刻届を提出しますか？</p>
                <div className="scan-result-actions">
                  <button
                    className="btn btn--secondary"
                    onClick={onClose}
                  >
                    閉じる
                  </button>
                  <button
                    className="btn btn--primary"
                    onClick={handleLateRequest}
                  >
                    遅刻届を出す
                  </button>
                </div>
              </div>
            </div>
          )}

          {scanResult?.requiresSelection && scanResult.classes && (
            <div className="scan-result">
              <div className="scan-result-icon">📚</div>
              <h3>授業を選択してください</h3>
              <p className="scan-result-message">{scanResult.message}</p>
              <div className="class-selection">
                {scanResult.classes.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => onSelectClass(cls.id)}
                    className="class-option btn btn--primary"
                    style={{
                      width: '100%',
                      marginBottom: '10px',
                      padding: '15px',
                      textAlign: 'left',
                    }}
                  >
                    <strong>{cls.subject_name}</strong> - {cls.class_code}
                    <br />
                    <small>{cls.start_time} - {cls.end_time}</small>
                  </button>
                ))}
              </div>
              <div className="scan-result-actions">
                <button
                  className="btn btn--secondary"
                  onClick={handleCancelScan}
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {/* 通常の出席完了表示 */}
          {scanResult && !scanResult.requiresSelection && scanResult.status !== 'late' && (
            <div className="scan-result success-result">
              <div className="scan-result-icon success-icon">✓</div>
              <h3>出席完了</h3>
              <p className="scan-result-message">{scanResult.message || 'QRコードをスキャンしました'}</p>
              {scanResult.logicalDate && (
                <p className="scan-result-date">{scanResult.logicalDate}</p>
              )}
            </div>
          )}

          {!scanResult && isScanning ? (
            <div className="scanner-container">
              <Scanner
                onScan={handleScan}
                onError={handleError}
                constraints={{
                  facingMode: 'environment', // 背面カメラを優先
                }}
              />
              <div className="scanner-instructions">
                <p>学校のQRコードをカメラの中央に合わせてください</p>
                <button
                  className="btn btn--secondary"
                  onClick={handleStopScan}
                >
                  スキャン停止
                </button>
              </div>
            </div>
          ) : !scanResult && (
            <div className="scanner-start">
              <div className="scanner-icon">📱</div>
              <h3>QRコードスキャン</h3>
              <p>学校のQRコードをスキャンして出欠記録を行います</p>
              <div className="scanner-tips">
                <h4>スキャンのコツ:</h4>
                <ul>
                  <li>QRコードをカメラの中央に配置</li>
                  <li>適度な距離を保つ（30-50cm）</li>
                  <li>明るい場所でスキャン</li>
                  <li>カメラを安定させる</li>
                </ul>
              </div>
              <button
                className="btn btn--primary"
                onClick={handleStartScan}
              >
                スキャン開始
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentQRScanner;
