import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { attendanceApi } from '../api/attendanceApi';
import useToastStore from '../stores/toastStore';
import Button from '../components/common/Button';
import './ForgotPasswordPage.css';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const addToast = useToastStore((state) => state.addToast);

  const handleSubmit = async(e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const response = await attendanceApi.forgotPassword(email);
      if (response.success) {
        setIsSubmitted(true);
        addToast('パスワードリセットの手順をメールで送信しました', 'success');
      } else {
        addToast(response.message || 'エラーが発生しました', 'error');
      }
    } catch (error) {
      // APIのエラーハンドリングでトーストが表示されるはずだが、念のため
      console.error('Forgot password error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="forgot-password-page">
        <div className="forgot-password-container">
          <h1>メール送信完了</h1>
          <p className="success-message">
            {email} 宛にパスワードリセットの手順を送信しました。<br />
            メールを確認して、パスワードの再設定を行ってください。
          </p>
          <div className="actions">
            <Link to="/login" className="back-link">ログイン画面に戻る</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-container">
        <h1>パスワードをお忘れの方</h1>
        <p className="description">
          登録したメールアドレスを入力してください。<br />
          パスワード再設定用のリンクを送信します。
        </p>

        <form onSubmit={handleSubmit} className="forgot-password-form">
          <div className="form-group">
            <label htmlFor="email">メールアドレス</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
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
            送信する
          </Button>

          <div className="actions">
            <Link to="/login" className="back-link">ログイン画面に戻る</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
