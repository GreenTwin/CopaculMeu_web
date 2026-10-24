import React from 'react';
import { TreePine, Search, PlusCircle, Activity, Settings, Server, Lock, Globe } from 'lucide-react';
import type { ApiStatus } from '../services/api';
import { UserMenu } from './UserMenu';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { RomaniaFlag, GreatBritainFlag } from './Flags';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  apiStatus: ApiStatus | null;
  onOpenProposeModal: () => void;
  onOpenSettingsModal: () => void;
  totalVisibleTrees: number;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  apiStatus,
  onOpenProposeModal,
  onOpenSettingsModal,
  totalVisibleTrees,
}) => {
  const isLive = apiStatus?.source === 'backend_live';
  const { isAuthenticated, openAuthModal } = useAuth();
  const { language, setLanguage, t } = useLanguage();

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

      {/* Actions and Status */}
      <div className="header-actions">
        {/* Clickable API Status Badge (opens Settings) */}
        <button
          type="button"
          onClick={onOpenSettingsModal}
          className={`api-status-badge ${
            apiStatus?.connected ? 'connected' : 'offline'
          } ${isLive ? 'mode-live' : 'mode-demo'}`}
          title={`${apiStatus?.message || 'Configurare sursă date'} - Click pentru setări`}
        >
          {isLive ? (
            <Server size={14} className="status-pulse" />
          ) : (
            <Activity size={14} className="status-pulse" />
          )}
          <span className="status-text">
            {isLive ? `${t('header.liveMode')}: ${apiStatus?.host || 'Backend'}` : t('header.demoMode')}
          </span>
          <span className="tree-counter">{t('header.treeCount', { count: totalVisibleTrees })}</span>
        </button>

        {/* Propose Tree CTA */}
        <button
          className={`propose-tree-btn ${!isAuthenticated ? 'auth-restricted' : ''}`}
          onClick={handleProposeClick}
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

        {/* User Account & Login Menu */}
        <UserMenu />

        {/* Quick Language Toggle with SVG flags */}
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
