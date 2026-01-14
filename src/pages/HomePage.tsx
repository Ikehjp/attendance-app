import React from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import './HomePage.css';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuthStore();

  // 認証状態の読み込み中は何もしない（App.jsxでローディング表示）
  React.useEffect(() => {
    if (isLoading) return;

    // 認証済みの場合はダッシュボードにリダイレクト
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSignInClick = () => {
    navigate('/login');
  };

  const handleSignUpClick = () => {
    navigate('/register');
  };

  return (
    <div className="home-page">
      <div className="home-container">
        {/* ヘッダー */}
        <header className="home-header">
          <div className="home-header__content">
            <h1 className="home-header__title">📚 出欠管理システム</h1>
            <p className="home-header__subtitle">
              学生の出欠を効率的に管理するためのプラットフォーム
            </p>
            <div className="home-header__actions">
              <button
                className="btn btn--primary btn--large"
                onClick={handleSignInClick}
              >
                サインイン
              </button>
              <button
                className="btn btn--secondary btn--large"
                onClick={handleSignUpClick}
              >
                新規登録
              </button>
            </div>
          </div>
        </header>

        {/* メインフィーチャー */}
        <section className="home-features">
          <div className="container">
            <h2 className="home-features__title">主な機能</h2>
            <div className="home-features__grid">
              <div className="feature-card">
                <div className="feature-card__icon">📋</div>
                <h3 className="feature-card__title">出欠管理</h3>
                <p className="feature-card__description">
                  QRコードスキャンで簡単に出欠を記録。リアルタイムで学生の出席状況を管理できます。
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-card__icon">👥</div>
                <h3 className="feature-card__title">グループ管理</h3>
                <p className="feature-card__description">
                  クラスや授業ごとにグループを作成し、効率的な学生管理を実現します。
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-card__icon">📊</div>
                <h3 className="feature-card__title">レポート生成</h3>
                <p className="feature-card__description">
                  出席データを自動集計し、詳細なレポートを生成。データ分析が簡単にできます。
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-card__icon">📱</div>
                <h3 className="feature-card__title">モバイル対応</h3>
                <p className="feature-card__description">
                  スマートフォンやタブレットからもアクセス可能。どこからでも出欠管理ができます。
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-card__icon">🔔</div>
                <h3 className="feature-card__title">通知機能</h3>
                <p className="feature-card__description">
                  重要な更新をリアルタイムで通知。欠席や遅刻の情報をすぐに確認できます。
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-card__icon">🔒</div>
                <h3 className="feature-card__title">セキュリティ</h3>
                <p className="feature-card__description">
                  JWT認証による安全なデータ管理。個人情報を適切に保護します。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 使用方法 */}
        <section className="home-howto">
          <div className="container">
            <h2 className="home-howto__title">使い方は簡単</h2>
            <div className="home-howto__steps">
              <div className="step-card">
                <div className="step-card__number">1</div>
                <h3 className="step-card__title">アカウント作成</h3>
                <p className="step-card__description">
                  学籍番号、メールアドレス、パスワードを入力して登録します
                </p>
              </div>

              <div className="step-card">
                <div className="step-card__number">2</div>
                <h3 className="step-card__title">ログイン</h3>
                <p className="step-card__description">
                  登録した情報でログインし、ダッシュボードにアクセスします
                </p>
              </div>

              <div className="step-card">
                <div className="step-card__number">3</div>
                <h3 className="step-card__title">出欠記録</h3>
                <p className="step-card__description">
                  QRコードをスキャンするだけで出欠を記録。自動で履歴が保存されます
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* フッター */}
        <footer className="home-footer">
          <div className="container">
            <p className="home-footer__text">
              © 2025 出欠管理システム. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;
