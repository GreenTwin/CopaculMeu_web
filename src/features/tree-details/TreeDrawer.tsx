import React, { useState, useMemo, useEffect } from 'react';
import { TreeResponse, TreeCheckinRequest, HealthLevel, WateringLevel } from '../../types/tree';
import { getDistanceMeters, formatDistance, formatRelativeTime } from '../../utils/geo';
import {
  Droplets,
  HeartPulse,
  Ruler,
  Calendar,
  MapPin,
  X,
  Check,
  Navigation,
  AlertTriangle,
  Sparkles,
  Lock,
  LogIn,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  getUserTreeCheckinCooldown,
  recordUserTreeCheckin,
} from '../../services/checkinLimit';
import { fetchTreeCheckins } from '../../services/api';

interface TreeDrawerProps {
  tree: TreeResponse | null;
  onClose: () => void;
  userLocation: { lat: number; lng: number } | null;
  onSubmitCheckin: (treeId: number, data: TreeCheckinRequest) => Promise<void>;
  onSimulateNearby: (tree: TreeResponse) => void;
}

const HEALTH_COLORS: Record<HealthLevel, { color: string; bg: string }> = {
  EXCELLENT: { color: '#059669', bg: '#ecfdf5' },
  GOOD: { color: '#10b981', bg: '#f0fdf4' },
  FAIR: { color: '#d97706', bg: '#fffbeb' },
  POOR: { color: '#ea580c', bg: '#fff7ed' },
  CRITICAL: { color: '#dc2626', bg: '#fef2f2' },
  DEAD: { color: '#64748b', bg: '#f8fafc' },
};

const WATER_COLORS: Record<WateringLevel, { color: string; bg: string }> = {
  OPTIMAL: { color: '#0284c7', bg: '#f0f9ff' },
  MODERATE: { color: '#0ea5e9', bg: '#f0fdfa' },
  LOW: { color: '#f59e0b', bg: '#fffbeb' },
  CRITICAL_DROUGHT: { color: '#ef4444', bg: '#fef2f2' },
  OVERWATERED: { color: '#6366f1', bg: '#eef2ff' },
};

export const TreeDrawer: React.FC<TreeDrawerProps> = ({
  tree,
  onClose,
  userLocation,
  onSubmitCheckin,
  onSimulateNearby,
}) => {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { language, t } = useLanguage();
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [watered, setWatered] = useState(true);
  const [wateringLevel, setWateringLevel] = useState<WateringLevel>('OPTIMAL');
  const [healthLevel, setHealthLevel] = useState<HealthLevel>(tree?.healthLevel || 'GOOD');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [cooldownTick, setCooldownTick] = useState(0);

  // Determine 24h cooldown for current user on this specific tree
  const cooldownStatus = useMemo(() => {
    if (!tree || !isAuthenticated || !user) {
      return { canCheckin: true, remainingMs: 0, remainingFormatted: '' };
    }
    const userId = user.id || user.email;
    return getUserTreeCheckinCooldown(userId, tree.id, language);
  }, [tree?.id, isAuthenticated, user?.id, user?.email, cooldownTick, language]);

  // Periodic interval to refresh remaining cooldown duration
  useEffect(() => {
    if (cooldownStatus.canCheckin || cooldownStatus.remainingMs <= 0) return;
    const interval = setInterval(() => {
      setCooldownTick((t) => t + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, [cooldownStatus.canCheckin, cooldownStatus.remainingMs]);

  // Sync check-in history from backend if available
  useEffect(() => {
    if (!tree || !user) return;
    const userId = user.id || user.email;
    fetchTreeCheckins(tree.id)
      .then((checkins) => {
        const userRecentCheckin = checkins.find((c) => {
          if (c.userId && (c.userId === user.id || c.userId === user.email)) {
            const time = new Date(c.createdAt).getTime();
            return Date.now() - time < 24 * 60 * 60 * 1000;
          }
          return false;
        });
        if (userRecentCheckin) {
          recordUserTreeCheckin(userId, tree.id, new Date(userRecentCheckin.createdAt).getTime());
          setCooldownTick((t) => t + 1);
        }
      })
      .catch(() => {});
  }, [tree?.id, user?.id, user?.email]);

  if (!tree) return null;

  const distanceMeters = userLocation
    ? getDistanceMeters(userLocation.lat, userLocation.lng, tree.latitude, tree.longitude)
    : null;

  // The backend enforces <= 2.0m deviation for valid check-ins
  const isWithinProximity = distanceMeters !== null && distanceMeters <= 2.5;

  const handleCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setIsCheckinOpen(false);
      openAuthModal(
        'login',
        t('treeDrawer.authRequiredCardDesc')
      );
      return;
    }

    if (!cooldownStatus.canCheckin) {
      setFeedbackMsg(
        t('treeDrawer.cooldownDisabledTooltip', { remaining: cooldownStatus.remainingFormatted })
      );
      return;
    }

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

      if (user) {
        recordUserTreeCheckin(user.id || user.email, tree.id);
        setCooldownTick((t) => t + 1);
      }

      setFeedbackMsg(t('treeDrawer.checkinSuccessFeedback'));
      setTimeout(() => {
        setIsCheckinOpen(false);
        setFeedbackMsg(null);
      }, 2000);
    } catch {
      setFeedbackMsg(t('treeDrawer.checkinErrorFeedback'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const healthColor = HEALTH_COLORS[tree.healthLevel] || HEALTH_COLORS.GOOD;
  const waterColor = WATER_COLORS[tree.wateringLevel] || WATER_COLORS.OPTIMAL;

  return (
    <>
      {/* Drawer Container (Desktop Sidebar / Mobile Bottom Sheet) */}
      <aside className="tree-drawer" aria-label={t('treeDrawer.checkinModalTitle', { species: tree.species })}>
        {/* Mobile drag handle */}
        <div className="drawer-handle" />

        <div className="drawer-header">
          <div>
            <div className="tree-id-tag">ID: #{tree.id}</div>
            <h2 className="tree-species">{tree.species}</h2>
          </div>
          <button className="close-btn" onClick={onClose} title={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        <div className="drawer-body">
          {/* Status Badges */}
          <div className="status-badges-row">
            <div className="status-badge" style={{ backgroundColor: healthColor.bg, color: healthColor.color, borderColor: healthColor.color }}>
              <HeartPulse size={15} />
              <span>{t('treeDrawer.healthLabel')} <strong>{t('healthLevels.short_' + tree.healthLevel)}</strong></span>
            </div>
            <div className="status-badge" style={{ backgroundColor: waterColor.bg, color: waterColor.color, borderColor: waterColor.color }}>
              <Droplets size={15} />
              <span>{t('treeDrawer.moistureLabel')} <strong>{t('wateringLevels.short_' + tree.wateringLevel)}</strong></span>
            </div>
          </div>

          {/* Critical Drought Alert Box */}
          {tree.wateringLevel === 'CRITICAL_DROUGHT' && (
            <div className="alert-banner">
              <AlertTriangle size={18} className="alert-icon" />
              <div>
                <strong>{t('treeDrawer.alertBannerTitle')}</strong>
                <p>{t('treeDrawer.alertBannerText')}</p>
              </div>
            </div>
          )}

          {/* Metrics Grid */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-header">
                <Ruler size={16} />
                <span>{t('treeDrawer.height')}</span>
              </div>
              <div className="metric-value">{tree.height ? `${tree.height} m` : t('common.unspecified')}</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <Calendar size={16} />
                <span>{t('treeDrawer.age')}</span>
              </div>
              <div className="metric-value">{tree.age ? `${tree.age} ${t('treeDrawer.ageUnit')}` : t('common.unspecified')}</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <Ruler size={16} />
                <span>{t('treeDrawer.trunkCircumference')}</span>
              </div>
              <div className="metric-value">{tree.trunkCircumference ? `${tree.trunkCircumference} cm` : t('common.unspecified')}</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <Droplets size={16} />
                <span>{t('treeDrawer.lastWatered')}</span>
              </div>
              <div className="metric-value">{formatRelativeTime(tree.lastWateredAt, language)}</div>
            </div>
          </div>

          {/* Location & Notes */}
          {tree.locationDescription && (
            <div className="info-section">
              <div className="info-title">
                <MapPin size={16} />
                <span>{t('treeDrawer.locationSection')}</span>
              </div>
              <p className="info-text">{tree.locationDescription}</p>
            </div>
          )}

          {tree.notes && (
            <div className="info-section">
              <div className="info-title">
                <span>{t('treeDrawer.landscapeNotesSection')}</span>
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
                      ? t('treeDrawer.proximityInRange')
                      : t('treeDrawer.proximityDistance', { distance: formatDistance(distanceMeters || 0) })
                    : t('treeDrawer.proximityNoGps')}
                </div>
                <div className="proximity-subtitle">
                  {isWithinProximity
                    ? t('treeDrawer.proximitySubInRange')
                    : t('treeDrawer.proximitySubOutOfRange')}
                </div>
              </div>
            </div>

            {!isWithinProximity && (
              <button
                type="button"
                className="simulate-gps-btn"
                onClick={() => onSimulateNearby(tree)}
                title={t('treeDrawer.simulateGpsTooltip')}
              >
                <Sparkles size={14} />
                <span>{t('treeDrawer.simulateGpsBtn')}</span>
              </button>
            )}
          </div>

          {/* Primary Action Button, Auth Required Card, or Cooldown Card */}
          {!isAuthenticated ? (
            <div className="auth-required-checkin-card">
              <div className="auth-required-header">
                <Lock size={15} className="auth-lock-icon" />
                <span className="auth-required-title">{t('treeDrawer.authRequiredCardTitle')}</span>
              </div>
              <p className="auth-required-desc">
                {t('treeDrawer.authRequiredCardDesc')}
              </p>
              <button
                type="button"
                className="primary-action-btn auth-cta-action-btn"
                onClick={() =>
                  openAuthModal(
                    'login',
                    t('treeDrawer.authRequiredCardDesc')
                  )
                }
              >
                <LogIn size={18} />
                <span>{t('treeDrawer.authRequiredCardBtn')}</span>
              </button>
            </div>
          ) : !cooldownStatus.canCheckin ? (
            <div className="checkin-cooldown-card">
              <div className="cooldown-header">
                <CheckCircle2 size={16} className="cooldown-check-icon" />
                <span className="cooldown-title">{t('treeDrawer.cooldownCardTitle')}</span>
              </div>
              <p className="cooldown-desc">
                {t('treeDrawer.cooldownCardDesc')}
              </p>
              <div className="cooldown-timer-badge">
                <Clock size={14} />
                <span>{t('treeDrawer.cooldownTimerLabel', { remaining: cooldownStatus.remainingFormatted })}</span>
              </div>
              <button
                type="button"
                className="primary-action-btn checkin-disabled-btn"
                disabled
                title={t('treeDrawer.cooldownDisabledTooltip', { remaining: cooldownStatus.remainingFormatted })}
              >
                <Check size={18} />
                <span>{t('treeDrawer.cooldownDisabledBtn')}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="primary-action-btn"
              onClick={() => setIsCheckinOpen(true)}
            >
              <Droplets size={18} />
              <span>{t('treeDrawer.doCheckinBtn')}</span>
            </button>
          )}
        </div>
      </aside>

      {/* Check-in Modal Form */}
      {isCheckinOpen && (
        <div className="modal-backdrop" onClick={() => setIsCheckinOpen(false)}>
          <div className="modal-card checkin-auth-modal" onClick={(e) => e.stopPropagation()}>
            {!isAuthenticated ? (
              <div className="auth-guard-body">
                <div className="modal-header auth-guard-header-row">
                  <h3>{t('treeDrawer.authModalTitle')}</h3>
                  <button className="close-btn" onClick={() => setIsCheckinOpen(false)}>
                    <X size={18} />
                  </button>
                </div>
                <div className="auth-guard-icon-box">
                  <Lock size={36} color="#059669" />
                </div>
                <h4>{t('treeDrawer.authModalSubtitle')}</h4>
                <p>
                  {t('treeDrawer.authModalDesc')}
                </p>
                <div className="auth-guard-actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setIsCheckinOpen(false)}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className="primary-action-btn"
                    onClick={() => {
                      setIsCheckinOpen(false);
                      openAuthModal(
                        'login',
                        t('treeDrawer.authRequiredCardDesc')
                      );
                    }}
                  >
                    <LogIn size={16} />
                    <span>{t('treeDrawer.authRequiredCardBtn')}</span>
                  </button>
                </div>
              </div>
            ) : !cooldownStatus.canCheckin ? (
              <div className="auth-guard-body">
                <div className="modal-header auth-guard-header-row">
                  <h3>{t('treeDrawer.cooldownModalTitle')}</h3>
                  <button className="close-btn" onClick={() => setIsCheckinOpen(false)}>
                    <X size={18} />
                  </button>
                </div>
                <div className="cooldown-big-icon">
                  <CheckCircle2 size={38} color="#059669" />
                </div>
                <h4>{t('treeDrawer.cooldownModalHeading')}</h4>
                <p>
                  {t('treeDrawer.cooldownModalDesc')}
                </p>
                <div className="cooldown-timer-badge">
                  <Clock size={15} />
                  <span>{t('treeDrawer.cooldownModalTimer', { remaining: cooldownStatus.remainingFormatted })}</span>
                </div>
                <div className="auth-guard-actions">
                  <button
                    type="button"
                    className="primary-action-btn"
                    onClick={() => setIsCheckinOpen(false)}
                  >
                    {t('treeDrawer.understoodBtn')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="modal-header">
                  <h3>{t('treeDrawer.checkinModalTitle', { species: tree.species })}</h3>
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
                    <span className="checkbox-text">{t('treeDrawer.wateredQuestion')}</span>
                  </label>
                </div>

                {/* Watering level */}
                <div className="form-group">
                  <label>{t('treeDrawer.soilMoistureLabel')}</label>
                  <select
                    value={wateringLevel}
                    onChange={(e) => setWateringLevel(e.target.value as WateringLevel)}
                  >
                    <option value="OPTIMAL">{t('wateringLevels.OPTIMAL')}</option>
                    <option value="MODERATE">{t('wateringLevels.MODERATE')}</option>
                    <option value="LOW">{t('wateringLevels.LOW')}</option>
                    <option value="CRITICAL_DROUGHT">{t('wateringLevels.CRITICAL_DROUGHT')}</option>
                    <option value="OVERWATERED">{t('wateringLevels.OVERWATERED')}</option>
                  </select>
                </div>

                {/* Health level */}
                <div className="form-group">
                  <label>{t('treeDrawer.overallHealthLabel')}</label>
                  <select
                    value={healthLevel}
                    onChange={(e) => setHealthLevel(e.target.value as HealthLevel)}
                  >
                    <option value="EXCELLENT">{t('healthLevels.EXCELLENT')}</option>
                    <option value="GOOD">{t('healthLevels.GOOD')}</option>
                    <option value="FAIR">{t('healthLevels.FAIR')}</option>
                    <option value="POOR">{t('healthLevels.POOR')}</option>
                    <option value="CRITICAL">{t('healthLevels.CRITICAL')}</option>
                    <option value="DEAD">{t('healthLevels.DEAD')}</option>
                  </select>
                </div>

                {/* Observation notes */}
                <div className="form-group">
                  <label>{t('treeDrawer.additionalNotesLabel')}</label>
                  <textarea
                    rows={3}
                    placeholder={t('treeDrawer.notesPlaceholder')}
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
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? t('treeDrawer.submittingCheckinBtn') : t('treeDrawer.confirmCheckinBtn')}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )}
    </>
  );
};
