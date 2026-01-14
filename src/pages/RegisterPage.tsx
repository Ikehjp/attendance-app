import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import './RegisterPage.css';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
  organizationName: string;
  joinCode: string;
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student', // デフォルトは生徒
    organizationName: '', // 管理者用
    joinCode: '', // 生徒用
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null,
      }));
    }

    // ロール変更時にバリデーションエラーをクリア
    if (name === 'role') {
      setValidationErrors(prev => ({
        ...prev,
        organizationName: null,
        joinCode: null,
      }));
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name) errors.name = '氏名は必須です';
    if (!formData.email) errors.email = 'メールアドレスは必須です';

    if (formData.role === 'owner') {
      if (!formData.organizationName) errors.organizationName = '組織名は必須です';
    } else if (formData.role === 'student') {
      if (!formData.joinCode) errors.joinCode = '参加コードは必須です';
    }

    if (formData.password.length < 6) errors.password = 'パスワードは6文字以上で入力してください';
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'パスワードが一致しません';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async(e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    // 送信データの構築
    const dataToSend: any = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
    };

    if (formData.role === 'owner') {
      dataToSend.organizationName = formData.organizationName;
    } else {
      dataToSend.joinCode = formData.joinCode;
    }

    const result = await register(dataToSend);

    if (!result.success) {
      setError(result.message || '登録に失敗しました');
    }

    setIsLoading(false);
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-card">
          <div className="register-header">
            <h1 className="register-title">新規登録</h1>
            <p className="register-subtitle">新しいアカウントを作成します</p>
          </div>

          <form className="register-form" onSubmit={handleSubmit}>
            {error && <div className="error-message">{error}</div>}

            <div className="form-role-selection">
              <label>
                <input
                  type="radio"
                  name="role"
                  value="student"
                  checked={formData.role === 'student'}
                  onChange={handleInputChange}
                />
                <span className="radio-label">生徒 (参加)</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="role"
                  value="owner"
                  checked={formData.role === 'owner'}
                  onChange={handleInputChange}
                />
                <span className="radio-label">管理者 (組織作成)</span>
              </label>
            </div>

            <Input
              label="氏名"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              error={validationErrors.name}
              required
              placeholder="例: 山田 太郎"
              autoComplete="name"
            />

            <Input
              label="メールアドレス"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              error={validationErrors.email}
              required
              placeholder="例: user@example.com"
              autoComplete="email"
            />

            {formData.role === 'owner' && (
              <Input
                label="組織名 (学校名など)"
                type="text"
                name="organizationName"
                value={formData.organizationName}
                onChange={handleInputChange}
                error={validationErrors.organizationName}
                required
                placeholder="例: ○○大学 情報学部"
                autoComplete="organization"
              />
            )}

            {formData.role === 'student' && (
              <Input
                label="参加コード"
                type="text"
                name="joinCode"
                value={formData.joinCode}
                onChange={handleInputChange}
                error={validationErrors.joinCode}
                required
                placeholder="学校/組織から配布されたコードを入力"
                autoComplete="off"
              />
            )}

            <div className="form-row">
              <Input
                label="パスワード"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                error={validationErrors.password}
                required
                placeholder="6文字以上で入力"
                autoComplete="new-password"
              />

              <Input
                label="パスワード確認"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                error={validationErrors.confirmPassword}
                required
                placeholder="パスワードを再入力"
                autoComplete="new-password"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="large"
              className="register-button"
              loading={isLoading}
            >
              新規登録
            </Button>
          </form>

          <div className="register-footer">
            <p className="register-help">
              既にアカウントをお持ちの場合は、
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="login-link"
            >
              ログインはこちら
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;