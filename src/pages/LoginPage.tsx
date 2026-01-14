import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import { checkServerHealth } from '../api/attendanceApi';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import './LoginPage.css';

interface LoginFormData {
  email: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore(); // Zustandから状態とアクションを取得
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [serverStatus, setServerStatus] = useState<{
    checking: boolean;
    isOnline: boolean | null;
    message: string | null;
  }>({
    checking: false,
    isOnline: null,
    message: null,
  });

  // 既にログインしている場合はダッシュボードにリダイレクト
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // サーバー状態をチェック
  useEffect(() => {
    const checkServer = async() => {
      setServerStatus({ checking: true, isOnline: null, message: null });
      try {
        const result = await checkServerHealth();
        setServerStatus({
          checking: false,
          isOnline: result.success,
          message: result.message,
        });
      } catch (err) {
        setServerStatus({
          checking: false,
          isOnline: false,
          message: 'サーバー状態の確認に失敗しました',
        });
      }
    };

    // ページロード時にサーバー状態をチェック
    checkServer();
  }, []);

  // エラーが変更されたときにバリデーションエラーをクリア
  useEffect(() => {
    if (error) {
      setValidationErrors({});
    }
  }, [error]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // 入力時にバリデーションエラーをクリア
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }

    // エラーメッセージをクリア
    if (error) {
      setError('');
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.email.trim()) {
      errors.email = 'メールアドレスを入力してください';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = '有効なメールアドレスを入力してください';
    }

    if (!formData.password.trim()) {
      errors.password = 'パスワードを入力してください';
    } else if (formData.password.length < 6) {
      errors.password = 'パスワードは6文字以上で入力してください';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async(e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await login(formData.email, formData.password);

    if (result.success) {
      // ログイン成功時のリダイレクトはuseEffectに任せる
    } else {
      setError('ログインに失敗しました。メールアドレスまたはパスワードを確認してください。');
    }

    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-loading">
            <div className="spinner" />
            <p>ログイン中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1 className="login-title">出欠管理システム</h1>
            <p className="login-subtitle">ログインしてください</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {/* サーバー状態表示（開発環境のみ） */}
            {process.env.NODE_ENV === 'development' && (
              <div style={{
                padding: '10px',
                marginBottom: '15px',
                borderRadius: '4px',
                fontSize: '12px',
                backgroundColor: serverStatus.checking
                  ? '#e3f2fd'
                  : serverStatus.isOnline
                    ? '#e8f5e9'
                    : '#ffebee',
                color: serverStatus.checking
                  ? '#1976d2'
                  : serverStatus.isOnline
                    ? '#2e7d32'
                    : '#c62828',
                border: `1px solid ${serverStatus.checking
                  ? '#1976d2'
                  : serverStatus.isOnline
                    ? '#4caf50'
                    : '#f44336'}`,
              }}>
                <strong>サーバー状態:</strong> {
                  serverStatus.checking
                    ? '確認中...'
                    : serverStatus.isOnline
                      ? '✓ オンライン'
                      : '✗ オフライン'
                }
                {serverStatus.message && (
                  <div style={{ marginTop: '5px', fontSize: '11px' }}>
                    {serverStatus.message}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <Input
              label="メールアドレス"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              error={validationErrors.email}
              required
              placeholder="example@company.com"
            />

            <Input
              label="パスワード"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              error={validationErrors.password}
              required
              placeholder="パスワードを入力"
            />

            <div style={{ textAlign: 'right', marginTop: '-8px', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="link-button"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4a90e2',
                  fontSize: '14px',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  padding: 0,
                }}
                onFocus={(e) => { e.target.style.textDecoration = 'underline'; }}
                onBlur={(e) => { e.target.style.textDecoration = 'none'; }}
              >
                パスワードをお忘れの方
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="large"
              className="login-button"
              loading={isLoading}
            >
              ログイン
            </Button>

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <Button
                type="button"
                variant="secondary"
                size="medium"
                onClick={() => {
                  // ゲストモードとしてホームページに移動
                  navigate('/');
                }}
                style={{ width: '100%' }}
              >
                ゲストとして続行
              </Button>
            </div>
          </form>

          <div className="login-footer">
            <p className="login-help">
              アカウントをお持ちでない場合は、
            </p>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="register-link"
            >
              新規登録はこちら
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
