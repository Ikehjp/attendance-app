import React, { useState } from 'react';
import { Scanner, IDetectedBarcode } from '@yudiel/react-qr-scanner';
import './QRScanner.css';

interface QRScannerComponentProps {
  onScan: (data: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

const QRScannerComponent: React.FC<QRScannerComponentProps> = ({ onScan, onClose, isOpen }) => {
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  const handleScan = (detectedCodes: IDetectedBarcode[]) => {
    if (detectedCodes && detectedCodes.length > 0) {
      setIsScanning(false);
      try {
        // QRコードから学生IDを抽出
        const studentId = detectedCodes[0].rawValue.trim();
        onScan(studentId);
      } catch (err) {
        setError('QRコードの解析に失敗しました');
        console.error('QR解析エラー:', err);
      }
    }
  };

  const handleError = (error: unknown) => {
    console.error('QRスキャナーエラー:', error);
    setError('カメラへのアクセスに失敗しました。カメラの許可を確認してください。');
  };

  const handleStartScan = () => {
    setError(null);
    setIsScanning(true);
  };

  const handleStopScan = () => {
    setIsScanning(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="qr-scanner-overlay">
      <div className="qr-scanner-modal">
        <div className="qr-scanner-header">
          <h2>QRコード読み取り</h2>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className="qr-scanner-content">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {isScanning ? (
            <div className="scanner-container">
              <Scanner
                onScan={handleScan}
                onError={handleError}
                constraints={{
                  facingMode: 'environment', // 背面カメラを優先
                }}
              />
              <div className="scanner-instructions">
                <p>QRコードをカメラの中央に合わせてください</p>
                <button
                  className="btn btn--secondary"
                  onClick={handleStopScan}
                >
                  スキャン停止
                </button>
              </div>
            </div>
          ) : (
            <div className="scanner-start">
              <div className="scanner-icon">📱</div>
              <p>QRコードスキャンを開始するには、下のボタンを押してください</p>
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

export default QRScannerComponent;
