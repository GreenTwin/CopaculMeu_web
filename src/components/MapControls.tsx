import React from 'react';
import { Crosshair, Droplets, Info, Layers } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface MapActionProps {
  onLocateUser: () => void;
  isLocating: boolean;
  filterDroughtOnly: boolean;
  onToggleDroughtFilter: () => void;
  isLiveTracking?: boolean;
  isLegendOpen: boolean;
  onToggleLegend: () => void;
  layout: 'hud' | 'menu';
}

export const MapActionButtons: React.FC<MapActionProps> = ({
  onLocateUser,
  isLocating,
  filterDroughtOnly,
  onToggleDroughtFilter,
  isLiveTracking = false,
  isLegendOpen,
  onToggleLegend,
  layout,
}) => {
  const { t } = useLanguage();
  const inMenu = layout === 'menu';
  const itemClass = inMenu ? 'mobile-menu-item' : 'hud-btn';
  const iconSize = inMenu ? 20 : 18;

  return (
    <>
      <button
        type="button"
        className={`${itemClass} ${!inMenu && filterDroughtOnly ? 'active-filter' : ''}`}
        onClick={onToggleDroughtFilter}
        aria-pressed={filterDroughtOnly}
        title={t('mapControls.droughtFilterTooltip')}
      >
        <Droplets size={iconSize} />
        <span className={inMenu ? 'mobile-menu-text' : 'hud-label'}>
          {inMenu || !filterDroughtOnly ? t('mapControls.droughtFilterOff') : t('mapControls.droughtFilterOn')}
        </span>
        {inMenu && (
          <span className={`mobile-menu-switch ${filterDroughtOnly ? 'is-on' : ''}`} aria-hidden="true" />
        )}
      </button>

      <button
        type="button"
        className={`${itemClass} ${!inMenu && isLiveTracking ? 'live-gps-active' : ''} ${isLocating ? 'loading' : ''}`}
        onClick={onLocateUser}
        title={isLiveTracking ? t('mapControls.locateTooltipLive') : t('mapControls.locateTooltip')}
      >
        {!inMenu && isLiveTracking && <span className="hud-live-indicator" />}
        <Crosshair size={iconSize} />
        <span className={inMenu ? 'mobile-menu-text' : 'hud-label'}>
          {isLocating
            ? t('mapControls.locating')
            : isLiveTracking
            ? t('mapControls.locateMeLive')
            : t('mapControls.locateMe')}
        </span>
      </button>

      <button
        type="button"
        className={`${itemClass} ${!inMenu && isLegendOpen ? 'active' : ''}`}
        onClick={onToggleLegend}
        title={t('mapControls.legendTooltip')}
      >
        <Layers size={iconSize} />
        <span className={inMenu ? 'mobile-menu-text' : 'hud-label'}>{t('mapControls.legendBtn')}</span>
      </button>
    </>
  );
};

interface MapControlsProps {
  onLocateUser: () => void;
  isLocating: boolean;
  filterDroughtOnly: boolean;
  onToggleDroughtFilter: () => void;
  isLiveTracking?: boolean;
  showHud: boolean;
  isLegendOpen: boolean;
  onToggleLegend: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  showHud,
  isLegendOpen,
  onToggleLegend,
  ...actions
}) => {
  const { t } = useLanguage();

  return (
    <>
      {showHud && (
        <div className="floating-hud">
          <MapActionButtons
            layout="hud"
            isLegendOpen={isLegendOpen}
            onToggleLegend={onToggleLegend}
            {...actions}
          />
        </div>
      )}

      {/* Legend Modal / Card */}
      {isLegendOpen && (
        <div className="legend-card">
          <div className="legend-header">
            <h4>{t('mapControls.legendTitle')}</h4>
            <button className="legend-close-btn" onClick={onToggleLegend}>
              &times;
            </button>
          </div>

          <div className="legend-section">
            <span className="legend-subtitle">{t('mapControls.clustersSection')}</span>
            <div className="legend-item">
              <div className="cluster-sample small">5</div>
              <span>{t('mapControls.clusterSmall')}</span>
            </div>
            <div className="legend-item">
              <div className="cluster-sample medium">24</div>
              <span>{t('mapControls.clusterMedium')}</span>
            </div>
            <div className="legend-item">
              <div className="cluster-sample large">75</div>
              <span>{t('mapControls.clusterLarge')}</span>
            </div>
          </div>

          <div className="legend-section">
            <span className="legend-subtitle">{t('mapControls.healthSection')}</span>
            <div className="legend-item">
              <span className="color-dot pin-health-EXCELLENT" />
              <span>{t('mapControls.healthExcellent')}</span>
            </div>
            <div className="legend-item">
              <span className="color-dot pin-health-GOOD" />
              <span>{t('mapControls.healthGood')}</span>
            </div>
            <div className="legend-item">
              <span className="color-dot pin-health-FAIR" />
              <span>{t('mapControls.healthFair')}</span>
            </div>
            <div className="legend-item">
              <span className="color-dot pin-health-POOR" />
              <span>{t('mapControls.healthPoor')}</span>
            </div>
            <div className="legend-item">
              <span className="color-dot pin-health-CRITICAL" />
              <span>{t('mapControls.healthCritical')}</span>
            </div>
          </div>

          <div className="legend-footer">
            <Info size={14} />
            <span>{t('mapControls.legendFooter')}</span>
          </div>
        </div>
      )}
    </>
  );
};
