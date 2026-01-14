import React, { useRef, useState, useEffect } from 'react';
import QRCode from 'qrcode';
import './QRGenerator.css';

interface QRGeneratorProps {
  qrImage?: string | null;
  qrCode?: string;
  locationName: string;
  description?: string;
  expiresAt?: string;
  onClose?: () => void;
}

/**
 * QRコード表示・印刷・保存コンポーネント
 */
const QRGenerator: React.FC<QRGeneratorProps> = ({ qrImage, qrCode, locationName, description, expiresAt, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(qrImage || null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // qrImageがない場合、qrCodeからQR画像を生成
  useEffect(() => {
    const generateQRImage = async () => {
      if (!qrImage && qrCode) {
        setLoading(true);
        setError(null);
        try {
          const dataUrl = await QRCode.toDataURL(qrCode, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            width: 400,
            margin: 2,
          });
          setGeneratedImage(dataUrl);
        } catch (err) {
          setError('QRコードの生成に失敗しました');
        } finally {
          setLoading(false);
        }
      } else if (qrImage) {
        setGeneratedImage(qrImage);
      }
    };

    generateQRImage();
  }, [qrImage, qrCode, locationName]);

  // 印刷機能
  const handlePrint = () => {
    if (!generatedImage) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>QRコード印刷 - ${locationName}</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Arial, sans-serif;
              text-align: center;
              padding: 40px;
            }
            .qr-container {
              border: 2px solid #000;
              padding: 40px;
              display: inline-block;
              border-radius: 10px;
            }
            .location-name {
              font-size: 32px;
              font-weight: bold;
              margin-bottom: 20px;
            }
            .qr-image {
              width: 400px;
              height: 400px;
            }
            .description {
              margin-top: 20px;
              font-size: 18px;
              color: #555;
            }
            .footer {
              margin-top: 40px;
              font-size: 14px;
              color: #999;
            }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="location-name">${locationName}</div>
            <img src="${generatedImage}" class="qr-image" alt="QR Code" />
            ${description ? `<div class="description">${description}</div>` : ''}
            ${expiresAt ? `<div class="description">有効期限: ${new Date(expiresAt).toLocaleString()}</div>` : ''}
          </div>
          <div class="footer">
            Attendance System Location QR
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // 保存機能
  const handleSave = () => {
    if (!generatedImage) return;

    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `QR_${locationName.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="qr-generator-container">
        <div className="qr-loading">
          <p>QRコードを生成中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="qr-generator-container">
        <div className="qr-error">
          <p>⚠️ {error}</p>
          {qrCode && <p className="qr-code-fallback">コード: <code>{qrCode}</code></p>}
        </div>
      </div>
    );
  }

  return (
    <div className="qr-generator-container">
      <div className="qr-preview">
        <h3>{locationName}</h3>
        {generatedImage ? (
          <img src={generatedImage} alt="QR Code" className="qr-image-preview" />
        ) : (
          <div className="qr-placeholder">
            <p>QRコード画像がありません</p>
            {qrCode && <p>コード: {qrCode}</p>}
          </div>
        )}
        {description && <p className="qr-description">{description}</p>}
        {expiresAt && <p className="qr-expires">有効期限: {new Date(expiresAt).toLocaleString()}</p>}
      </div>

      <div className="qr-actions">
        <button
          type="button"
          onClick={handlePrint}
          className="btn btn--primary"
          disabled={!generatedImage}
        >
          🖨️ 印刷
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="btn btn--secondary"
          disabled={!generatedImage}
        >
          💾 画像保存
        </button>
        {onClose && (
          <button type="button" onClick={onClose} className="btn btn--outline">
            閉じる
          </button>
        )}
      </div>
    </div>
  );
};

export default QRGenerator;
