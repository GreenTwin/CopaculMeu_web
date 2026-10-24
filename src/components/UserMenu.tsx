import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon, LogIn, LogOut, ShieldCheck, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const UserMenu: React.FC = () => {
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  if (!isAuthenticated || !user) {
    return (
      <button
        type="button"
        className="auth-header-login-btn"
        onClick={() => openAuthModal('login')}
        title={t('userMenu.loginPromptTooltip')}
      >
        <LogIn size={16} />
        <span className="btn-label">{t('header.authBtn')}</span>
      </button>
    );
  }

  // Generate initials from name or email
  const initials = (user.name || user.email)
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .slice(0, 2)
    .join('') || 'U';

  const firstName = user.name ? user.name.split(' ')[0] : user.email.split('@')[0];

  return (
    <div className="user-menu-container" ref={containerRef}>
      <button
        type="button"
        className={`user-menu-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={t('userMenu.profileTooltip', { name: user.name || user.email })}
      >
        <div className="user-avatar-circle">
          <span>{initials}</span>
        </div>
        <span className="user-trigger-name">{firstName}</span>
        {user.role === 'ADMIN' && <span className="admin-pill">Admin</span>}
        <ChevronDown size={14} className={`user-chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="user-menu-dropdown">
          <div className="user-dropdown-header">
            <div className="user-dropdown-avatar">{initials}</div>
            <div className="user-dropdown-info">
              <strong className="user-dropdown-name">{user.name || t('userMenu.unnamedUser')}</strong>
              <span className="user-dropdown-email">{user.email}</span>
              <div className="user-badges-row">
                <span className="user-role-badge">
                  <ShieldCheck size={12} />
                  <span>{user.role === 'ADMIN' ? t('userMenu.roleAdmin') : t('userMenu.roleVolunteer')}</span>
                </span>
                <span className="user-status-badge">
                  <CheckCircle2 size={12} color="#059669" />
                  <span>{user.status === 'ACTIVE' ? t('userMenu.statusActive') : t('userMenu.statusRegistered')}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="user-dropdown-divider" />

          <div className="user-dropdown-actions">
            <button
              type="button"
              className="user-logout-action-btn"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
            >
              <LogOut size={16} />
              <span>{t('userMenu.signOut')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
