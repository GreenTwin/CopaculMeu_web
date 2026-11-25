import React, { useEffect, useRef } from 'react';
import { Languages, Menu, Moon, PlusCircle, Search, Settings, ShieldCheck, Sun, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { navigateTo } from '../utils/navigation';
import { RomaniaFlag, GreatBritainFlag } from './Flags';
import { MapActionButtons } from './MapControls';
import { MOBILE_MENU_SECTIONS, type MobileMenuSection } from './mobileMenuSections';
import { UserMenu } from './UserMenu';

interface MobileMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenProposeModal: () => void;
  onOpenSettings: () => void;
  onOpenAdminModal?: () => void;
  onLocateUser: () => void;
  isLocating: boolean;
  filterDroughtOnly: boolean;
  onToggleDroughtFilter: () => void;
  isLiveTracking: boolean;
  isLegendOpen: boolean;
  onToggleLegend: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onToggle,
  onClose,
  searchQuery,
  onSearchChange,
  onOpenProposeModal,
  onOpenSettings,
  onOpenAdminModal,
  onLocateUser,
  isLocating,
  filterDroughtOnly,
  onToggleDroughtFilter,
  isLiveTracking,
  isLegendOpen,
  onToggleLegend,
}) => {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    drawerRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const openPropose = () => {
    onClose();
    if (!isAuthenticated) {
      openAuthModal('login', t('authModal.proposeContextNotice'));
      return;
    }
    onOpenProposeModal();
  };

  const openAdmin = () => {
    onClose();
    if (onOpenAdminModal) onOpenAdminModal();
    else navigateTo('/admin/users');
  };

  const sectionTitle: Record<MobileMenuSection, string> = {
    map: t('header.menuMap'),
    account: t('header.menuAccount'),
    preferences: t('header.menuPreferences'),
  };

  const themeName = theme === 'dark' ? t('header.themeDark') : t('header.themeLight');

  const sectionBody: Record<MobileMenuSection, React.ReactNode> = {
    map: (
      <MapActionButtons
        layout="menu"
        onLocateUser={onLocateUser}
        isLocating={isLocating}
        filterDroughtOnly={filterDroughtOnly}
        onToggleDroughtFilter={onToggleDroughtFilter}
        isLiveTracking={isLiveTracking}
        isLegendOpen={isLegendOpen}
        onToggleLegend={() => {
          onToggleLegend();
          onClose();
        }}
      />
    ),
    account: (
      <>
        <button type="button" className="mobile-menu-item" onClick={openPropose} aria-label={t('header.proposeTreeBtn')}>
          <PlusCircle size={20} />
          <span className="mobile-menu-copy">
            <span className="mobile-menu-text">{t('header.proposeTreeBtn')}</span>
            {!isAuthenticated && <span className="mobile-menu-hint">{t('header.proposeNeedsSignIn')}</span>}
          </span>
        </button>
        {isAuthenticated && user?.role === 'ADMIN' && (
          <button type="button" className="mobile-menu-item" onClick={openAdmin}>
            <ShieldCheck size={20} />
            <span className="mobile-menu-text">{t('admin.headerBtn')}</span>
          </button>
        )}
        <UserMenu onOpenAdminModal={onOpenAdminModal} onDismissMenu={onClose} variant="drawer" />
      </>
    ),
    preferences: (
      <>
        <div className="mobile-menu-item mobile-menu-choice">
          <Languages size={20} />
          <span className="mobile-menu-text">{t('header.language')}</span>
          <div className="mobile-menu-segment" role="group" aria-label={t('header.language')}>
            <button
              type="button"
              className={language === 'ro' ? 'is-selected' : undefined}
              onClick={() => setLanguage('ro')}
              aria-pressed={language === 'ro'}
              aria-label="Română"
            >
              <RomaniaFlag size={14} />
              <span>RO</span>
            </button>
            <button
              type="button"
              className={language === 'en' ? 'is-selected' : undefined}
              onClick={() => setLanguage('en')}
              aria-pressed={language === 'en'}
              aria-label="English"
            >
              <GreatBritainFlag size={14} />
              <span>EN</span>
            </button>
          </div>
        </div>
        <button
          type="button"
          className="mobile-menu-item"
          onClick={toggleTheme}
          aria-label={`${t('header.theme')}, ${themeName}`}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          <span className="mobile-menu-text">{t('header.theme')}</span>
          <span className="mobile-menu-trailing">{themeName}</span>
        </button>
        <button
          type="button"
          className="mobile-menu-item"
          onClick={() => {
            onClose();
            onOpenSettings();
          }}
        >
          <Settings size={20} />
          <span className="mobile-menu-text">{t('header.settings')}</span>
        </button>
      </>
    ),
  };

  return (
    <>
      <button
        type="button"
        className={`menu-button ${isOpen ? 'is-open' : ''}`}
        aria-label={t('header.menu')}
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <button
        type="button"
        className={`mobile-menu-backdrop ${isOpen ? 'is-open' : ''}`}
        aria-hidden={!isOpen}
        tabIndex={-1}
        onClick={onClose}
      />

      <div
        ref={drawerRef}
        className={`mobile-menu ${isOpen ? 'is-open' : ''}`}
        role="dialog"
        aria-labelledby="mobile-menu-title"
        aria-modal={isOpen}
        aria-hidden={!isOpen}
        tabIndex={-1}
      >
        <div className="mobile-menu-header">
          <h2 id="mobile-menu-title">{t('header.menu')}</h2>
        </div>

        <div className="search-bar-container mobile-menu-search">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder={t('header.searchPlaceholderShort')}
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>

        {MOBILE_MENU_SECTIONS.map((section) => (
          <section key={section} className="mobile-menu-section" aria-labelledby={`mobile-menu-${section}`}>
            <h3 id={`mobile-menu-${section}`} className="mobile-menu-heading">{sectionTitle[section]}</h3>
            {sectionBody[section]}
          </section>
        ))}
      </div>
    </>
  );
};
