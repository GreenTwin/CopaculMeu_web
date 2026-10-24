import React, { useState } from 'react';
import { Crosshair, Droplets, Info, Layers } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface MapControlsProps {
  onLocateUser: () => void;
  isLocating: boolean;
  filterDroughtOnly: boolean;
  onToggleDroughtFilter: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  onLocateUser,
  isLocating,
  filterDroughtOnly,
  onToggleDroughtFilter,
}) => {
  const { t } = useLanguage();
  const [isLegendOpen, setIsLegendOpen] = useState(false);

  return (
    <>
      {/* Floating HUD on the bottom-left */}
      <div className="floating-hud">
        {/* Quick Filter: Drought Alert */}
        <button
          className={`hud-btn ${filterDroughtOnly ? 'active-filter' : ''}`}
          onClick={onToggleDroughtFilter}
          title={t('mapControls.droughtFilterTooltip')}
        >
          <Droplets size={18} />
          <span className="hud-label">
            {filterDroughtOnly ? t('mapControls.droughtFilterOn') : t('mapControls.droughtFilterOff')}
          </span>
        </button>

        {/* Locate Me */}
        <button
          className={`hud-btn ${isLocating ? 'loading' : ''}`}
          onClick={onLocateUser}
          title={t('mapControls.locateTooltip')}
        >
          <Crosshair size={18} />
          <span className="hud-label">{isLocating ? t('mapControls.locating') : t('mapControls.locateMe')}</span>
        </button>

        {/* Legend Toggle */}
        <button
          className={`hud-btn ${isLegendOpen ? 'active' : ''}`}
          onClick={() => setIsLegendOpen(!isLegendOpen)}
          title={t('mapControls.legendTooltip')}
        >
          <Layers size={18} />
          <span className="hud-label">{t('mapControls.legendBtn')}</span>
        </button>
      </div>

      {/* Legend Modal / Card */}
      {isLegendOpen && (
        <div className="legend-card">
          <div className="legend-header">
            <h4>{t('mapControls.legendTitle')}</h4>
            <button className="legend-close-btn" onClick={() => setIsLegendOpen(false)}>
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
