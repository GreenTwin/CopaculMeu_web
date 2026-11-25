import React from 'react';
import { Droplets, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { PHONE_QUICK_ACTIONS, type PhoneQuickAction } from './quickActionList';

interface MapQuickActionsProps {
  filterDroughtOnly: boolean;
  onToggleDroughtFilter: () => void;
  onOpenProposeModal: () => void;
}

export const MapQuickActions: React.FC<MapQuickActionsProps> = ({
  filterDroughtOnly,
  onToggleDroughtFilter,
  onOpenProposeModal,
}) => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const { t } = useLanguage();

  const addTree = () => {
    if (!isAuthenticated) {
      openAuthModal('login', t('authModal.proposeContextNotice'));
      return;
    }
    onOpenProposeModal();
  };

  const actions: Record<PhoneQuickAction, React.ReactNode> = {
    addTree: (
      <button type="button" className="phone-quick-add" onClick={addTree}>
        <Plus size={18} />
        <span>{t('header.quickAddTree')}</span>
      </button>
    ),
    needsWater: (
      <button
        type="button"
        className={`phone-quick-water ${filterDroughtOnly ? 'is-on' : ''}`}
        onClick={onToggleDroughtFilter}
        aria-pressed={filterDroughtOnly}
      >
        <Droplets size={18} />
        <span>{t('mapControls.droughtFilterOff')}</span>
      </button>
    ),
  };

  return (
    <div className="phone-quick-actions" role="group" aria-label={t('header.quickActions')}>
      {PHONE_QUICK_ACTIONS.map((action) => (
        <React.Fragment key={action}>{actions[action]}</React.Fragment>
      ))}
    </div>
  );
};
