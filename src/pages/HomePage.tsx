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
            <h1 className="home-header__title" translate="no">🔗 Link Up</h1>
            <p className="home-header__subtitle">
              つながる、記録する、見える化する - スマートな出欠管理システム
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
                <div className="feature-card__icon">💳</div>
                <h3 className="feature-card__title">ICカード対応</h3>
                <p className="feature-card__description">
                  Suica/PASMOなどのICカードを登録。カードリーダーにタッチするだけで出席登録が完了します。
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-card__icon">📱</div>
                <h3 className="feature-card__title">QRコード出席</h3>
                <p className="feature-card__description">
                  教員がQRコードを生成し、学生がスキャン。シンプルで確実な出席記録を実現します。
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-card__icon">📝</div>
                <h3 className="feature-card__title">欠席申請システム</h3>
                <p className="feature-card__description">
                  学生が欠席理由を申請し、教員が承認・却下。スムーズなコミュニケーションを実現します。
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-card__icon">📅</div>
                <h3 className="feature-card__title">時間割管理</h3>
                <p className="feature-card__description">
                  授業スケジュールを一元管理。週次・月次カレンダーで出席状況を可視化します。
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-card__icon">📊</div>
                <h3 className="feature-card__title">出席統計</h3>
                <p className="feature-card__description">
                  出席率や傾向をグラフで表示。データに基づいた学習支援が可能です。
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-card__icon">🔔</div>
                <h3 className="feature-card__title">リアルタイム通知</h3>
                <p className="feature-card__description">
                  承認結果や重要な更新を即座に通知。見逃しを防ぎます。
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
              © 2026 Link Up. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;
