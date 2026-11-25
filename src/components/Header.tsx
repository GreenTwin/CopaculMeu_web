import React from 'react';
import { TreePine, Search, PlusCircle, Settings, Lock, Sun, Moon, ShieldCheck } from 'lucide-react';
import type { ApiStatus } from '../services/api';
import { UserMenu } from './UserMenu';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { RomaniaFlag, GreatBritainFlag } from './Flags';
import { navigateTo } from '../utils/navigation';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  apiStatus?: ApiStatus | null;
  onOpenProposeModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenAdminModal?: () => void;
  totalVisibleTrees: number;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  apiStatus,
  onOpenProposeModal,
  onOpenSettingsModal,
  onOpenAdminModal,
  totalVisibleTrees,
}) => {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const handleProposeClick = () => {
    if (!isAuthenticated) {
      openAuthModal(
        'login',
        t('authModal.proposeContextNotice')
      );
      return;
    }
    onOpenProposeModal();
  };

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-logo">
          <TreePine size={22} className="brand-icon" />
        </div>
        <div className="brand-text">
          <h1 className="brand-title">{t('common.appName')}</h1>
          <span className="brand-badge">{t('common.cityName')}</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="search-bar-container">
        <Search size={17} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder={t('header.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button className="clear-search-btn" onClick={() => onSearchChange('')}>
            &times;
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="header-actions">
        {/* Propose Tree CTA */}
        <button
          className={`propose-tree-btn ${!isAuthenticated ? 'auth-restricted' : ''}`}
          onClick={handleProposeClick}
          aria-label={t('header.proposeTreeBtn')}
          title={
            isAuthenticated
              ? t('header.proposeTreeTooltip')
              : t('header.proposeTreeTooltipAuth')
          }
        >
          <PlusCircle size={17} />
          <span className="btn-label">{t('header.proposeTreeBtn')}</span>
          {!isAuthenticated && <Lock size={12} className="btn-lock-badge" />}
        </button>

        {/* Admin Quick Entry */}
        {isAuthenticated && user?.role === 'ADMIN' && (
          <button
            type="button"
            className="admin-header-pill-btn"
            onClick={() => {
              if (onOpenAdminModal) onOpenAdminModal();
              else navigateTo('/admin/users');
            }}
            title={t('admin.openPanelTooltip')}
          >
            <ShieldCheck size={16} />
            <span className="btn-label">{t('admin.headerBtn')}</span>
          </button>
        )}

        {/* User Account & Login Menu */}
        <UserMenu onOpenAdminModal={onOpenAdminModal} />

        <div className="lang-toggle-pill" title={t('header.languageToggleTooltip')}>
          <button
            type="button"
            className={`lang-pill-btn ${language === 'ro' ? 'active' : ''}`}
            onClick={() => setLanguage('ro')}
            aria-label="Română"
            title="Română"
          >
            <RomaniaFlag size={13} />
            <span className="lang-code">RO</span>
          </button>
          <button
            type="button"
            className={`lang-pill-btn ${language === 'en' ? 'active' : ''}`}
            onClick={() => setLanguage('en')}
            aria-label="English"
            title="English"
          >
            <GreatBritainFlag size={13} />
            <span className="lang-code">EN</span>
          </button>
        </div>

        {/* Quick Theme Toggle (Light / Dark) */}
        <button
          type="button"
          className={`theme-toggle-btn ${theme}`}
          onClick={toggleTheme}
          title={t('header.themeToggleTooltip')}
          aria-label={theme === 'dark' ? 'Comută la tema luminoasă' : 'Comută la tema întunecată'}
        >
          {theme === 'dark' ? (
            <Sun size={17} className="theme-toggle-icon theme-sun" />
          ) : (
            <Moon size={17} className="theme-toggle-icon theme-moon" />
          )}
        </button>

        {/* Settings button */}
        <button
          type="button"
          className="settings-icon-btn"
          onClick={onOpenSettingsModal}
          title={t('header.settingsBtnTooltip')}
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
};
