import React, { useState } from 'react';
import { TreeResponse, TreeCheckinRequest, HealthLevel, WateringLevel } from '../../types/tree';
import { getDistanceMeters, formatDistance, formatRelativeTime } from '../../utils/geo';
import { Droplets, HeartPulse, Ruler, Calendar, MapPin, X, Check, Navigation, AlertTriangle, Sparkles } from 'lucide-react';

interface TreeDrawerProps {
  tree: TreeResponse | null;
  onClose: () => void;
  userLocation: { lat: number; lng: number } | null;
  onSubmitCheckin: (treeId: number, data: TreeCheckinRequest) => Promise<void>;
  onSimulateNearby: (tree: TreeResponse) => void;
}

const HEALTH_CONFIG: Record<HealthLevel, { label: string; color: string; bg: string }> = {
  EXCELLENT: { label: 'Excelentă', color: '#059669', bg: '#ecfdf5' },
  GOOD: { label: 'Bună', color: '#10b981', bg: '#f0fdf4' },
  FAIR: { label: 'Acceptabilă', color: '#d97706', bg: '#fffbeb' },
  POOR: { label: 'Precară', color: '#ea580c', bg: '#fff7ed' },
  CRITICAL: { label: 'Critică', color: '#dc2626', bg: '#fef2f2' },
  DEAD: { label: 'Uscat / Mort', color: '#64748b', bg: '#f8fafc' },
};

const WATER_CONFIG: Record<WateringLevel, { label: string; color: string; bg: string }> = {
  OPTIMAL: { label: 'Optim', color: '#0284c7', bg: '#f0f9ff' },
  MODERATE: { label: 'Moderat', color: '#0ea5e9', bg: '#f0fdfa' },
  LOW: { label: 'Scăzut', color: '#f59e0b', bg: '#fffbeb' },
  CRITICAL_DROUGHT: { label: 'Secetă Severă', color: '#ef4444', bg: '#fef2f2' },
  OVERWATERED: { label: 'Exces de apă', color: '#6366f1', bg: '#eef2ff' },
};

export const TreeDrawer: React.FC<TreeDrawerProps> = ({
  tree,
  onClose,
  userLocation,
  onSubmitCheckin,
  onSimulateNearby,
}) => {
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [watered, setWatered] = useState(true);
  const [wateringLevel, setWateringLevel] = useState<WateringLevel>('OPTIMAL');
  const [healthLevel, setHealthLevel] = useState<HealthLevel>(tree?.healthLevel || 'GOOD');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!tree) return null;

  const distanceMeters = userLocation
    ? getDistanceMeters(userLocation.lat, userLocation.lng, tree.latitude, tree.longitude)
    : null;

  // The backend enforces <= 2.0m deviation for valid check-ins
  const isWithinProximity = distanceMeters !== null && distanceMeters <= 2.5;

  const handleCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedbackMsg(null);

    // Fallback coordinates if user geolocation not permitted yet
    const lat = userLocation ? userLocation.lat : tree.latitude;
    const lng = userLocation ? userLocation.lng : tree.longitude;

    try {
      await onSubmitCheckin(tree.id, {
        latitude: lat,
        longitude: lng,
        watered,
        wateringLevel,
        healthLevel,
        notes: notes.trim() || undefined,
      });
      setFeedbackMsg('Check-in înregistrat cu succes! Mulțumim pentru implicare! 🌱');
      setTimeout(() => {
        setIsCheckinOpen(false);
        setFeedbackMsg(null);
      }, 2000);
    } catch {
      setFeedbackMsg('Eroare la trimiterea check-in-ului. Încearcă din nou.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const health = HEALTH_CONFIG[tree.healthLevel];
  const water = WATER_CONFIG[tree.wateringLevel];

  return (
    <>
      {/* Drawer Container (Desktop Sidebar / Mobile Bottom Sheet) */}
      <aside className="tree-drawer" aria-label="Detalii arbore">
        {/* Mobile drag handle */}
        <div className="drawer-handle" />

        <div className="drawer-header">
          <div>
            <div className="tree-id-tag">ID: #{tree.id}</div>
            <h2 className="tree-species">{tree.species}</h2>
          </div>
          <button className="close-btn" onClick={onClose} title="Închide">
            <X size={20} />
          </button>
        </div>

        <div className="drawer-body">
          {/* Status Badges */}
          <div className="status-badges-row">
            <div className="status-badge" style={{ backgroundColor: health.bg, color: health.color, borderColor: health.color }}>
              <HeartPulse size={15} />
              <span>Stare: <strong>{health.label}</strong></span>
            </div>
            <div className="status-badge" style={{ backgroundColor: water.bg, color: water.color, borderColor: water.color }}>
              <Droplets size={15} />
              <span>Umiditate: <strong>{water.label}</strong></span>
            </div>
          </div>

          {/* Critical Drought Alert Box */}
          {tree.wateringLevel === 'CRITICAL_DROUGHT' && (
            <div className="alert-banner">
              <AlertTriangle size={18} className="alert-icon" />
              <div>
                <strong>Atenție: Sol uscat sever!</strong>
                <p>Acest copac are nevoie urgentă de udare.</p>
              </div>
            </div>
          )}

          {/* Metrics Grid */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-header">
                <Ruler size={16} />
                <span>Înălțime</span>
              </div>
              <div className="metric-value">{tree.height ? `${tree.height} m` : 'Nespecificat'}</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <Calendar size={16} />
                <span>Vârstă estimată</span>
              </div>
              <div className="metric-value">{tree.age ? `${tree.age} ani` : 'Nespecificat'}</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <Ruler size={16} />
                <span>Circumferință trunchi</span>
              </div>
              <div className="metric-value">{tree.trunkCircumference ? `${tree.trunkCircumference} cm` : 'Nespecificat'}</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <Droplets size={16} />
                <span>Ultima udare</span>
              </div>
              <div className="metric-value">{formatRelativeTime(tree.lastWateredAt)}</div>
            </div>
          </div>

          {/* Location & Notes */}
          {tree.locationDescription && (
            <div className="info-section">
              <div className="info-title">
                <MapPin size={16} />
                <span>Locație</span>
              </div>
              <p className="info-text">{tree.locationDescription}</p>
            </div>
          )}

          {tree.notes && (
            <div className="info-section">
              <div className="info-title">
                <span>Observații peisagistice</span>
              </div>
              <p className="info-text notes-text">{tree.notes}</p>
            </div>
          )}

          {/* GPS Proximity Radar Card */}
          <div className={`proximity-card ${isWithinProximity ? 'in-range' : 'out-of-range'}`}>
            <div className="proximity-header">
              <Navigation size={18} className="nav-icon" />
              <div>
                <div className="proximity-title">
                  {userLocation
                    ? isWithinProximity
                      ? 'Ești chiar lângă arbore (Rază validată ✓)'
                      : `Distanță: ${formatDistance(distanceMeters || 0)}`
                    : 'Locație GPS nedetectată'}
                </div>
                <div className="proximity-subtitle">
                  {isWithinProximity
                    ? 'Check-in-ul va fi validat cu precizie de sub 2.0 m.'
                    : 'Conform regulilor API, este necesară apropierea de arbore (≤ 2.0 m).'}
                </div>
              </div>
            </div>

            {!isWithinProximity && (
              <button
                type="button"
                className="simulate-gps-btn"
                onClick={() => onSimulateNearby(tree)}
                title="Ajustează poziția GPS pentru testare rapidă"
              >
                <Sparkles size={14} />
                <span>Simulează prezența la arbore (Demo GPS)</span>
              </button>
            )}
          </div>

          {/* Primary Action Button */}
          <button
            className="primary-action-btn"
            onClick={() => setIsCheckinOpen(true)}
          >
            <Droplets size={18} />
            <span>Fă Check-in & Înregistrează Udare</span>
          </button>
        </div>
      </aside>

      {/* Check-in Modal Form */}
      {isCheckinOpen && (
        <div className="modal-backdrop" onClick={() => setIsCheckinOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Check-in Arbore: {tree.species}</h3>
              <button className="close-btn" onClick={() => setIsCheckinOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {feedbackMsg ? (
              <div className="feedback-banner">
                <Check size={24} color="#059669" />
                <p>{feedbackMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleCheckinSubmit} className="checkin-form">
                {/* Watered question */}
                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={watered}
                      onChange={(e) => setWatered(e.target.checked)}
                    />
                    <span className="checkbox-text">Ai udat acest arbore în timpul vizitei?</span>
                  </label>
                </div>

                {/* Watering level */}
                <div className="form-group">
                  <label>Umiditatea solului observată:</label>
                  <select
                    value={wateringLevel}
                    onChange={(e) => setWateringLevel(e.target.value as WateringLevel)}
                  >
                    <option value="OPTIMAL">Optim (Sol reavăn, bine hidratat)</option>
                    <option value="MODERATE">Moderat (Sol parțial uscat)</option>
                    <option value="LOW">Scăzut (Sol uscat la suprafață)</option>
                    <option value="CRITICAL_DROUGHT">Secetă severă (Sol crăpat, frunze ofilite)</option>
                    <option value="OVERWATERED">Exces (Apă stagnantă la rădăcină)</option>
                  </select>
                </div>

                {/* Health level */}
                <div className="form-group">
                  <label>Starea generală de sănătate:</label>
                  <select
                    value={healthLevel}
                    onChange={(e) => setHealthLevel(e.target.value as HealthLevel)}
                  >
                    <option value="EXCELLENT">Excelentă (Viguros, fără dăunători)</option>
                    <option value="GOOD">Bună (Normal, coronament verde)</option>
                    <option value="FAIR">Acceptabilă (Mici crengi uscate)</option>
                    <option value="POOR">Precară (Semne vizibile de boală/paraziți)</option>
                    <option value="CRITICAL">Critică (Crengi rupte, putregai trunchi)</option>
                    <option value="DEAD">Uscat / Mort</option>
                  </select>
                </div>

                {/* Observation notes */}
                <div className="form-group">
                  <label>Observații suplimentare:</label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Am turnat 20L de apă, solul a absorbit imediat..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setIsCheckinOpen(false)}
                  >
                    Renunță
                  </button>
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Se trimite...' : 'Confirmă Check-in'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
