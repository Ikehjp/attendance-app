import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { attendanceApi } from '../api/attendanceApi';
import useToastStore from '../stores/toastStore';
import Button from '../components/common/Button';
import './ForgotPasswordPage.css'; // Reuse styles

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    if (!token) {
      addToast('トークンが無効です。再試行してください。', 'error');
      navigate('/login');
    }
  }, [token, navigate, addToast]);

  const handleSubmit = async(e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      addToast('パスワードは6文字以上で入力してください', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      addToast('パスワードが一致しません', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await attendanceApi.resetPassword(token, newPassword);
      if (response.success) {
        addToast('パスワードを再設定しました。新しいパスワードでログインしてください。', 'success');
        navigate('/login');
      } else {
        addToast(response.message || 'エラーが発生しました', 'error');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      addToast('サーバーエラーが発生しました', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) return null;

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-container">
        <h1>新しいパスワードの設定</h1>
        <p className="description">
          新しいパスワードを入力してください。
        </p>

        <form onSubmit={handleSubmit} className="forgot-password-form">
          <div className="form-group">
            <label htmlFor="newPassword">新しいパスワード</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="6文字以上"
              required
              minLength={6}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">パスワード（確認）</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="もう一度入力してください"
              required
              minLength={6}
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            loading={isLoading}
            disabled={isLoading}
            className="submit-button"
          >
            パスワードを変更する
          </Button>

          <div className="actions">
            <Link to="/login" className="back-link">キャンセル</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
