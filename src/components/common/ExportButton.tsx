import React, { useState } from 'react';
import Button from './Button';
import useToastStore from '../../stores/toastStore';
import { ButtonVariant, ButtonSize } from './Button';

interface ExportButtonProps {
  onExport: () => Promise<Blob | null | undefined>;
  filename?: string;
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

/**
 * エクスポートボタンコンポーネント
 * CSVファイルをダウンロードする
 */
const ExportButton: React.FC<ExportButtonProps> = ({
  onExport,
  filename,
  label = 'エクスポート',
  variant = 'secondary',
  size = 'medium',
  className = '',
}) => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const addToast = useToastStore((state) => state.addToast);

  const handleExport = async() => {
    setIsExporting(true);
    try {
      // onExport関数を呼び出してBlobデータを取得
      const blob = await onExport();

      if (!blob) {
        addToast('エクスポートするデータがありません', 'warning');
        return;
      }

      // Blob URLを作成
      const url = window.URL.createObjectURL(blob);

      // ダウンロードリンクを作成して自動クリック
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `export_${new Date().getTime()}.csv`;
      document.body.appendChild(link);
      link.click();

      // クリーンアップ
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      addToast('エクスポートが完了しました', 'success');
    } catch (error) {
      console.error('Export error:', error);
      // エラーハンドリングはAPIクライアントでトースト表示されるため、ここでは表示しない
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      variant={variant}
      size={size}
      loading={isExporting}
      disabled={isExporting}
      className={className}
    >
      {label}
    </Button>
  );
};

export default ExportButton;
