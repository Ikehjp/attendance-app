import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../stores/authStore';
import { notificationApi } from '../../api';
import './Header.css';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
}

// ドロップダウンメニューコンポーネント（デスクトップ用）
const Dropdown: React.FC<DropdownProps> = ({ trigger, children }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="dropdown-container" ref={dropdownRef}>
      <div className="dropdown-trigger" onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="dropdown-menu"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(false)}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface HamburgerIconProps {
  isOpen: boolean;
  onClick: () => void;
}

// ハンバーガーアイコンコンポーネント
const HamburgerIcon: React.FC<HamburgerIconProps> = ({ isOpen, onClick }) => (
  <button
    className={`hamburger-btn ${isOpen ? 'open' : ''}`}
    onClick={onClick}
    aria-label="メニューを開く"
  >
    <span className="hamburger-line" />
    <span className="hamburger-line" />
    <span className="hamburger-line" />
  </button>
);

const Header: React.FC = () => {
  const { user, isAuthenticated, logout, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const currentRole = user?.role;

  // 未読通知数を取得
  const fetchUnreadCount = useCallback(async() => {
    if (!isAuthenticated) return;
    try {
      const response = await notificationApi.getNotifications({ limit: 50 });
      if (response.success) {
        // ApiResponse<T> where T has notifications array
        // Assuming ApiResponse structure returns `data` which has `notifications`
        // We cast response.data to any for now if strict type is missing in notificationApi usage context here or rely on inference
        const data = response.data as any;
        const notifications = data?.notifications || [];
        const count = notifications.filter((n: any) => !n.is_read).length;
        setUnreadCount(count);
      }
    } catch (err) {
      console.error('未読通知取得エラー:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchUnreadCount();
    // 30秒ごとに更新
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // モバイルメニューが開いている時はスクロールを無効化
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleLogout = () => {
    setIsMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const getLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'nav-link active' : 'nav-link';

  const getDropdownItemClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'dropdown-item active' : 'dropdown-item';

  const getMobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'mobile-nav-link active' : 'mobile-nav-link';

  // 管理メニュー項目の定義
  const getManagementItems = () => {
    const items: { to: string; label: string }[] = [];
    if (!currentRole) return items;

    if (['owner', 'admin'].includes(currentRole)) {
      items.push({ to: '/students', label: '学生管理' });
      items.push({ to: '/groups', label: 'グループ管理' });
      items.push({ to: '/events', label: 'イベント管理' });
      items.push({ to: '/timetable', label: '時間割' });
      items.push({ to: '/student-attendance', label: '出欠記録' });
    } else if (currentRole === 'teacher') {
      items.push({ to: '/groups', label: 'グループ管理' });
      items.push({ to: '/events', label: 'イベント' });
      items.push({ to: '/student-attendance', label: '出欠記録' });
    } else if (currentRole === 'employee') {
      items.push({ to: '/student-attendance', label: '出欠記録' });
      items.push({ to: '/groups', label: 'グループ管理' });
      items.push({ to: '/events', label: 'イベント管理' });
    }
    return items;
  };

  const renderManagementMenu = () => {
    const items = getManagementItems();
    if (items.length === 0) return null;

    return (
      <Dropdown
        trigger={
          <span className="nav-link" style={{ cursor: 'pointer' }}>
            管理メニュー ▼
          </span>
        }
      >
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} className={getDropdownItemClass}>
            {item.label}
          </NavLink>
        ))}
      </Dropdown>
    );
  };

  return (
    <>
      <header className={`app-header ${isScrolled ? 'scrolled' : ''}`}>
        <nav className="navbar">
          <div className="navbar-left">
            <NavLink to="/" className="navbar-brand">
              📚 出欠管理
            </NavLink>
            {/* デスクトップ用ナビゲーション */}
            {isAuthenticated && (
              <div className="nav-links-left desktop-only">
                <NavLink to="/dashboard" className={getLinkClass}>ダッシュボード</NavLink>
                <NavLink to="/chat" className={getLinkClass}>チャット</NavLink>
                {currentRole === 'student' && (
                  <>
                    <NavLink to="/student-dashboard" className={getLinkClass}>📱 QRスキャン</NavLink>
                    <NavLink to="/events" className={getLinkClass}>イベント一覧</NavLink>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="navbar-right">
            {/* デスクトップ用メニュー */}
            {isLoading ? (
              <div className="nav-links-right desktop-only">
                <span className="loading-spinner" />
              </div>
            ) : isAuthenticated ? (
              <div className="nav-links-right desktop-only">
                {currentRole !== 'student' && renderManagementMenu()}

                {/* 通知アイコン */}
                <NavLink to="/notifications" className="notification-icon-wrapper">
                  <span className="notification-bell">🔔</span>
                  {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                </NavLink>

                <Dropdown
                  trigger={
                    <div className="profile-trigger">
                      <span className="profile-icon">
                        {user?.name?.charAt(0) || 'P'}
                      </span>
                    </div>
                  }
                >
                  <div className="dropdown-header" style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #eee', fontSize: '0.8rem', color: '#888' }}>
                    {user?.name}
                  </div>
                  <NavLink to="/calendar" className={getDropdownItemClass}>カレンダー</NavLink>
                  <NavLink to="/notifications" className={getDropdownItemClass}>
                    📬 お知らせ {unreadCount > 0 && <span className="menu-badge">{unreadCount}</span>}
                  </NavLink>
                  <NavLink to="/profile" className={getDropdownItemClass}>プロフィール</NavLink>
                  <button onClick={handleLogout} className="dropdown-item" style={{ color: '#ef4444' }}>
                    ログアウト
                  </button>
                </Dropdown>
              </div>
            ) : (
              <div className="nav-links-right desktop-only">
                <NavLink to="/login" className={getLinkClass}>ログイン</NavLink>
                <NavLink to="/register" className={getLinkClass}>新規登録</NavLink>
              </div>
            )}

            {/* モバイル用: お知らせベル + ハンバーガーボタン */}
            {isAuthenticated && (
              <NavLink to="/notifications" className="notification-icon-wrapper mobile-notification">
                <span className="notification-bell">🔔</span>
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </NavLink>
            )}
            <HamburgerIcon
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </div>
        </nav>
      </header>

      {/* モバイルドロワーメニュー */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* 背景オーバーレイ */}
            <motion.div
              className="mobile-menu-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobileMenu}
            />
            {/* ドロワー本体 */}
            <motion.div
              className="mobile-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
            >
              <div className="mobile-drawer-header">
                <span className="mobile-drawer-title">メニュー</span>
                <button className="mobile-drawer-close" onClick={closeMobileMenu}>
                  ✕
                </button>
              </div>

              {isAuthenticated ? (
                <div className="mobile-drawer-content">
                  {/* ユーザー情報（タップでプロフィールへ） */}
                  <NavLink to="/profile" className="mobile-user-info" onClick={closeMobileMenu}>
                    <span className="profile-icon large">{user?.name?.charAt(0) || 'P'}</span>
                    <div className="mobile-user-details">
                      <span className="mobile-user-name">{user?.name}</span>
                      <span className="mobile-user-hint">プロフィールを見る →</span>
                    </div>
                  </NavLink>

                  {/* ナビゲーションリンク */}
                  <div className="mobile-nav-section">
                    <NavLink to="/dashboard" className={getMobileLinkClass} onClick={closeMobileMenu}>
                      ダッシュボード
                    </NavLink>
                    <NavLink to="/calendar" className={getMobileLinkClass} onClick={closeMobileMenu}>
                      カレンダー
                    </NavLink>
                    <NavLink to="/chat" className={getMobileLinkClass} onClick={closeMobileMenu}>
                      チャット
                    </NavLink>
                  </div>

                  {/* 管理メニュー（権限がある場合） */}
                  {currentRole !== 'student' && getManagementItems().length > 0 && (
                    <div className="mobile-nav-section">
                      <div className="mobile-nav-section-title">管理</div>
                      {getManagementItems().map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          className={getMobileLinkClass}
                          onClick={closeMobileMenu}
                        >
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
                  )}

                  {/* 学生用リンク */}
                  {currentRole === 'student' && (
                    <div className="mobile-nav-section">
                      <div className="mobile-nav-section-title">学生メニュー</div>
                      <NavLink to="/student-dashboard" className={getMobileLinkClass} onClick={closeMobileMenu}>
                        📱 QRコードスキャン
                      </NavLink>
                      <NavLink to="/events" className={getMobileLinkClass} onClick={closeMobileMenu}>
                        イベント一覧
                      </NavLink>
                    </div>
                  )}

                  {/* その他 */}
                  <div className="mobile-nav-section">
                    <NavLink to="/notifications" className={getMobileLinkClass} onClick={closeMobileMenu}>
                      📬 お知らせ
                    </NavLink>
                    <NavLink to="/profile" className={getMobileLinkClass} onClick={closeMobileMenu}>
                      プロフィール
                    </NavLink>
                    <button className="mobile-nav-link logout" onClick={handleLogout}>
                      ログアウト
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mobile-drawer-content">
                  <div className="mobile-nav-section">
                    <NavLink to="/login" className={getMobileLinkClass} onClick={closeMobileMenu}>
                      ログイン
                    </NavLink>
                    <NavLink to="/register" className={getMobileLinkClass} onClick={closeMobileMenu}>
                      新規登録
                    </NavLink>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
