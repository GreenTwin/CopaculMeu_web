import React from 'react';
import { TreePine, Search, PlusCircle, Activity, Settings, Server } from 'lucide-react';
import type { ApiStatus } from '../services/api';

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

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-logo">
          <TreePine size={22} className="brand-icon" />
        </div>
        <div className="brand-text">
          <h1 className="brand-title">CopaculMeu</h1>
          <span className="brand-badge">Timișoara</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="search-bar-container">
        <Search size={17} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Caută specie (ex: Platan, Tei, Stejar) sau parc..."
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
            {isLive ? `Live: ${apiStatus?.host || 'Backend'}` : 'Mod Demo'}
          </span>
          <span className="tree-counter">({totalVisibleTrees} arbori)</span>
        </button>

        {/* Settings button */}
        <button
          type="button"
          className="settings-icon-btn"
          onClick={onOpenSettingsModal}
          title="Configurare Mod Demo / Live Backend & Host"
        >
          <Settings size={18} />
        </button>

        {/* Propose Tree CTA */}
        <button
          className="propose-tree-btn"
          onClick={onOpenProposeModal}
          title="Înregistrează un arbore nou pe hartă"
        >
          <PlusCircle size={17} />
          <span className="btn-label">Propune Arbore</span>
        </button>
      </div>
    </header>
  );
};
