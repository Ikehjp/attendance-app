import React, { lazy, Suspense, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import useAuthStore from './stores/authStore';
import ErrorBoundary from './components/common/ErrorBoundary';
import Header from './components/layout/Header';
import ToastContainer from './components/common/ToastContainer';
import PageTransition from './components/common/PageTransition'; // [追加]
import { registerServiceWorker, unregister } from './services/pwaService';
import UpdateNotification from './components/common/UpdateNotification';
import './styles/global.css';

// コード分割と遅延読み込み
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const StudentPage = lazy(() => import('./pages/StudentPage'));
const StudentAttendancePage = lazy(() => import('./pages/StudentAttendancePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const GroupsPage = lazy(() => import('./pages/GroupsPage'));
const StudentDashboardPage = lazy(() => import('./pages/StudentDashboardPage'));
const EventManagementPage = lazy(() => import('./pages/EventManagementPage'));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'));
const QRGeneratorPage = React.lazy(() => import('./pages/QRGeneratorPage'));
const AbsenceRequestPage = React.lazy(() => import('./pages/AbsenceRequestPage'));
const ApprovalManagementPage = React.lazy(() => import('./pages/ApprovalManagementPage'));
const TimetablePage = React.lazy(() => import('./pages/TimetablePage'));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage'));

// グローバルなローディングスピナー
const GlobalLoader = () => (
  <div className="loading-container">
    <div className="spinner" />
    <p>読み込み中...</p>
  </div>
);

// ページ読み込み中のフォールバック
const PageLoader = () => (
  <div className="loading-container">
    <div className="spinner" />
    <p>ページを読み込み中...</p>
  </div>
);

// 認証が必要なページを保護するコンポーネント
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <PageTransition>{children}</PageTransition>;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

ProtectedRoute.displayName = 'ProtectedRoute';

// ログインページ用のコンポーネント
const PublicRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return <PageLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/calendar" replace />;
  }

  return <PageTransition>{children}</PageTransition>;
};

PublicRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

PublicRoute.displayName = 'PublicRoute';

// ゲストアクセス可能なページ
const GuestRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return <PageLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/calendar" replace />;
  }

  return <PageTransition>{children}</PageTransition>;
};

GuestRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

GuestRoute.displayName = 'GuestRoute';

// 404 Not Found ページ
const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <PageTransition>
      <div className="not-found">
        <h1>404 - ページが見つかりません</h1>
        <p>お探しのページは存在しません。</p>
        <button
          onClick={() => navigate('/calendar')}
          className="btn btn--primary"
        >
          カレンダーに戻る
        </button>
      </div>
    </PageTransition>
  );
};

// メインアプリケーションコンポーネント
const AppContent = React.memo(() => {
  const { isAuthenticated, checkAuth, isLoading } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const renderRoutes = () => (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          {/* ゲストアクセス可能なルート */}
          <Route
            path="/"
            element={
              <GuestRoute>
                <HomePage />
              </GuestRoute>
            }
          />

          {/* パブリックルート */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPasswordPage />
              </PublicRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <PublicRoute>
                <ResetPasswordPage />
              </PublicRoute>
            }
          />

          {/* 保護されたルート */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <CalendarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students"
            element={
              <ProtectedRoute>
                <StudentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student-attendance"
            element={
              <ProtectedRoute>
                <StudentAttendancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/groups"
            element={
              <ProtectedRoute>
                <GroupsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student-dashboard"
            element={
              <ProtectedRoute>
                <StudentDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events"
            element={
              <ProtectedRoute>
                <EventManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/qr-generator"
            element={
              <ProtectedRoute>
                <QRGeneratorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/absence-request"
            element={
              <ProtectedRoute>
                <AbsenceRequestPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/approvals"
            element={
              <ProtectedRoute>
                <ApprovalManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/timetable"
            element={
              <ProtectedRoute>
                <TimetablePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />

          {/* 404ページ */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );

  return (
    <div className="app">
      {isAuthenticated && <Header />}
      <main className="main-content">
        {isLoading ? <GlobalLoader /> : renderRoutes()}
      </main>
    </div>
  );
});

AppContent.displayName = 'AppContent';


// アプリケーションのルートコンポーネント
const App = () => {
  const [waitingWorker, setWaitingWorker] = React.useState(null);
  const [showUpdateNotification, setShowUpdateNotification] = React.useState(false);

  useEffect(() => {
    // 開発環境ではService Workerを解除して、常に最新の状態にする
    if (process.env.NODE_ENV === 'development') {
      unregister();
      return;
    }

    // 本番環境ではPWAのService Workerを登録
    registerServiceWorker({
      onUpdate: (registration) => {
        setWaitingWorker(registration.waiting);
        setShowUpdateNotification(true);
      },
    }).catch((error) => {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Service Worker登録エラー:', error);
      }
    });
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ action: 'skipWaiting' });
    }
    // リロードはService Workerのcontrollerchangeイベントで処理されるのが理想だが、
    // 簡易的にここでリロードする（pwaService.jsの実装依存）
    // pwaService.jsでは reload() を呼んでいないため、ここで呼ぶか、
    // controllerchangeを監視する必要がある。
    // 今回は手動でリロードする。
    window.location.reload();
  };

  return (
    <ErrorBoundary>
      <Router>
        <AppContent />
        <ToastContainer />
        <UpdateNotification
          show={showUpdateNotification}
          onUpdate={handleUpdate}
          onClose={() => setShowUpdateNotification(false)}
        />
      </Router>
    </ErrorBoundary>
  );
};

export default App;
