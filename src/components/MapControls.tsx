import React, { useState } from 'react';
import { Crosshair, Droplets, Info, Layers } from 'lucide-react';

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
  const [isLegendOpen, setIsLegendOpen] = useState(false);

  return (
    <>
      {/* Floating HUD on the bottom-left */}
      <div className="floating-hud">
        {/* Quick Filter: Drought Alert */}
        <button
          className={`hud-btn ${filterDroughtOnly ? 'active-filter' : ''}`}
          onClick={onToggleDroughtFilter}
          title="Filtrează arborii care au nevoie urgentă de udare"
        >
          <Droplets size={18} />
          <span className="hud-label">
            {filterDroughtOnly ? 'Doar Însetați ✓' : 'Nevoie de Apă'}
          </span>
        </button>

        {/* Locate Me */}
        <button
          className={`hud-btn ${isLocating ? 'loading' : ''}`}
          onClick={onLocateUser}
          title="Detectează poziția ta GPS"
        >
          <Crosshair size={18} />
          <span className="hud-label">{isLocating ? 'Localizare...' : 'Unde sunt?'}</span>
        </button>

        {/* Legend Toggle */}
        <button
          className={`hud-btn ${isLegendOpen ? 'active' : ''}`}
          onClick={() => setIsLegendOpen(!isLegendOpen)}
          title="Legendă culori și grupări"
        >
          <Layers size={18} />
          <span className="hud-label">Legendă</span>
        </button>
      </div>

      {/* Legend Modal / Card */}
      {isLegendOpen && (
        <div className="legend-card">
          <div className="legend-header">
            <h4>Ghid Hartă & Bule</h4>
            <button className="legend-close-btn" onClick={() => setIsLegendOpen(false)}>
              &times;
            </button>
          </div>

          <div className="legend-section">
            <span className="legend-subtitle">Bule de Agregare (Cluster):</span>
            <div className="legend-item">
              <div className="cluster-sample small">5</div>
              <span>Sub 10 arbori (Rază locală)</span>
            </div>
            <div className="legend-item">
              <div className="cluster-sample medium">24</div>
              <span>10 - 49 arbori (Alee / Parc)</span>
            </div>
            <div className="legend-item">
              <div className="cluster-sample large">75</div>
              <span>Peste 50 arbori (Zonă densă)</span>
            </div>
          </div>

          <div className="legend-section">
            <span className="legend-subtitle">Stare de Sănătate Arbori:</span>
            <div className="legend-item">
              <span className="color-dot pin-health-EXCELLENT" />
              <span>Excelentă</span>
            </div>
            <div className="legend-item">
              <span className="color-dot pin-health-GOOD" />
              <span>Bună</span>
            </div>
            <div className="legend-item">
              <span className="color-dot pin-health-FAIR" />
              <span>Acceptabilă</span>
            </div>
            <div className="legend-item">
              <span className="color-dot pin-health-POOR" />
              <span>Precară</span>
            </div>
            <div className="legend-item">
              <span className="color-dot pin-health-CRITICAL" />
              <span>Critică / Uscăciune</span>
            </div>
          </div>

          <div className="legend-footer">
            <Info size={14} />
            <span>Apasă pe o bulă pentru a apropia vizualizarea.</span>
          </div>
        </div>
      )}
    </>
  );
};
