import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, TreePine, Check, ArrowRight, ArrowLeft, MapPin, Lock, LogIn } from 'lucide-react';
import type { TreeCreateRequest, HealthLevel, WateringLevel, SpeciesResponse } from '../types/tree';
import { GpsAdjusterMap } from './GpsAdjusterMap';
import { SpeciesSelect } from './SpeciesSelect';
import { getDistanceMetersPrecise } from '../utils/geo';
import { fetchAvailableSpecies } from '../services/species';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface ProposeTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCoords: { lat: number; lng: number };
  onSubmit: (data: TreeCreateRequest) => Promise<void>;
}

export const ProposeTreeModal: React.FC<ProposeTreeModalProps> = ({
  isOpen,
  onClose,
  defaultCoords,
  onSubmit,
}) => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState<1 | 2>(1);
  const [species, setSpecies] = useState('');
  const [availableSpecies, setAvailableSpecies] = useState<SpeciesResponse[]>([]);
  const [isLoadingSpecies, setIsLoadingSpecies] = useState(false);

  // Preserve stable reference to defaultCoords to prevent re-triggering effects
  const defaultCoordsRef = useRef(defaultCoords);
  defaultCoordsRef.current = defaultCoords;

  const [deviceBase, setDeviceBase] = useState<{ lat: number; lng: number }>(defaultCoords);
  const [adjustedPos, setAdjustedPos] = useState<{ lat: number; lng: number }>(defaultCoords);
  const [adjustmentMeters, setAdjustmentMeters] = useState(0);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'locating' | 'acquired' | 'fallback'>('acquired');

  const [healthLevel, setHealthLevel] = useState<HealthLevel>('GOOD');
  const [wateringLevel, setWateringLevel] = useState<WateringLevel>('OPTIMAL');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [trunkCircumference, setTrunkCircumference] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Manual / on-demand recalibration of device GPS (e.g. clicking 'Recalibrează' in map)
  const fetchDeviceGps = useCallback(() => {
    if (!navigator.geolocation) {
      const fallback = defaultCoordsRef.current;
      setDeviceBase(fallback);
      setAdjustedPos(fallback);
      setGpsStatus('fallback');
      return;
    }

    setIsLocating(true);
    setGpsStatus('locating');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setDeviceBase(coords);
        setAdjustedPos(coords);
        setAdjustmentMeters(0);
        setGpsStatus('acquired');
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation recalibration notice:', err.message);
        const fallback = defaultCoordsRef.current;
        setDeviceBase(fallback);
        setAdjustedPos(fallback);
        setAdjustmentMeters(0);
        setGpsStatus('fallback');
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  // Initialize once per modal open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      // Initialize with the stable snapshot of defaultCoords
      const initial = defaultCoordsRef.current;
      setDeviceBase(initial);
      setAdjustedPos(initial);
      setAdjustmentMeters(0);
      setGpsStatus('acquired');

      setIsLoadingSpecies(true);
      fetchAvailableSpecies()
        .then((list) => {
          setAvailableSpecies(list);
        })
        .catch((err) => {
          console.warn('Could not load available species:', err);
        })
        .finally(() => {
          setIsLoadingSpecies(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  if (!isAuthenticated) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-card propose-auth-guard-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="auth-brand-badge">
              <TreePine size={24} color="#059669" />
            </div>
            <div className="auth-header-text">
              <h3>{t('proposeTree.authGuardTitle')}</h3>
              <p>{t('proposeTree.authGuardSubtitle')}</p>
            </div>
            <button className="close-btn" onClick={onClose} title={t('common.close')}>
              <X size={18} />
            </button>
          </div>
          <div className="auth-guard-content">
            <div className="auth-guard-icon-box">
              <Lock size={36} color="#059669" />
            </div>
            <p>
              {t('proposeTree.authGuardDesc')}
            </p>
            <div className="auth-guard-actions">
              <button type="button" className="secondary-btn" onClick={onClose}>
                {t('proposeTree.authGuardCancel')}
              </button>
              <button
                type="button"
                className="primary-action-btn"
                onClick={() => {
                  onClose();
                  openAuthModal(
                    'login',
                    t('proposeTree.authGuardPrompt')
                  );
                }}
              >
                <LogIn size={16} />
                <span>{t('proposeTree.authGuardLoginBtn')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handlePositionChange = (pos: { lat: number; lng: number }, dist: number) => {
    setAdjustedPos(pos);
    setAdjustmentMeters(dist);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      openAuthModal(
        'login',
        t('proposeTree.authGuardPrompt')
      );
      return;
    }
    if (!species.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        species: species.trim(),
        latitude: adjustedPos.lat,
        longitude: adjustedPos.lng,
        healthLevel,
        wateringLevel,
        height: height ? parseFloat(height) : undefined,
        age: age ? parseInt(age, 10) : undefined,
        trunkCircumference: trunkCircumference ? parseFloat(trunkCircumference) : undefined,
        locationDescription: locationDescription.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1800);
    } catch {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card propose-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <TreePine size={20} color="#10b981" />
            <h3>{t('proposeTree.modalTitle')}</h3>
          </div>
          <button className="close-btn" onClick={onClose} title={t('common.close')}>
            <X size={18} />
          </button>
        </div>

        {isSuccess ? (
          <div className="feedback-banner">
            <Check size={28} color="#059669" />
            <div>
              <strong>{t('proposeTree.successTitle')}</strong>
              <p>{t('proposeTree.successBannerDesc')}</p>
            </div>
          </div>
        ) : (
          <div className="propose-form">
            {/* Step Indicator Header */}
            <div className="propose-step-indicator">
              <button
                type="button"
                className={`step-bubble ${step === 1 ? 'active' : 'completed'}`}
                onClick={() => setStep(1)}
              >
                <span className="step-circle">{step > 1 ? <Check size={14} /> : '1'}</span>
                <span className="step-name">{t('proposeTree.step1Nav')}</span>
              </button>
              <div className="step-track" />
              <button
                type="button"
                className={`step-bubble ${step === 2 ? 'active' : ''}`}
                onClick={() => setStep(2)}
              >
                <span className="step-circle">2</span>
                <span className="step-name">{t('proposeTree.step2Nav')}</span>
              </button>
            </div>

            {step === 1 ? (
              /* --- STEP 1: ADJUST THE POSITION --- */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="step-instruction-box">
                  <strong>{t('proposeTree.step1InstructionTitle')}</strong>
                  <p style={{ margin: '4px 0 0 0' }}>
                    {t('proposeTree.step1InstructionDesc')}
                  </p>
                </div>

                <div className="form-group">
                  <GpsAdjusterMap
                    deviceBase={deviceBase}
                    adjustedPos={adjustedPos}
                    adjustmentMeters={adjustmentMeters}
                    onPositionChange={handlePositionChange}
                    onRecalibrate={fetchDeviceGps}
                    isLocating={isLocating}
                    gpsStatus={gpsStatus}
                    height={230}
                  />
                </div>

                <div className="step-coords-summary">
                  <div className="coords-item">
                    <span className="coords-label">{t('proposeTree.latitude')}</span>
                    <span className="coords-val">{adjustedPos.lat.toFixed(6)}</span>
                  </div>
                  <div className="coords-item">
                    <span className="coords-label">{t('proposeTree.longitude')}</span>
                    <span className="coords-val">{adjustedPos.lng.toFixed(6)}</span>
                  </div>
                  <div className="coords-item">
                    <span className="coords-label">{t('proposeTree.fineAdjustment')}</span>
                    <span className="coords-val highlight">
                      {adjustmentMeters.toFixed(2)} m / 1.0 m
                    </span>
                  </div>
                </div>

                <div className="modal-actions" style={{ marginTop: '8px' }}>
                  <button type="button" className="cancel-btn" onClick={onClose}>
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className="submit-btn"
                    onClick={() => setStep(2)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <span>{t('proposeTree.continueStep2Btn')}</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              /* --- STEP 2: ADD THE DETAILS --- */
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="confirmed-position-chip">
                  <div className="chip-left">
                    <MapPin size={16} color="#059669" />
                    <span>
                      {t('proposeTree.locationLabelShort')}{' '}
                      <strong>{adjustedPos.lat.toFixed(5)}, {adjustedPos.lng.toFixed(5)}</strong>
                      {adjustmentMeters > 0 && (
                        <span className="dev-tag">
                          {' '}{t('proposeTree.adjustedDev', { dist: adjustmentMeters.toFixed(2) })}
                        </span>
                      )}
                    </span>
                  </div>
                  <button type="button" className="edit-pos-btn" onClick={() => setStep(1)}>
                    {t('proposeTree.editPositionBtn')}
                  </button>
                </div>

                {/* Species selection with custom theme-matched dropdown */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ margin: 0 }}>{t('proposeTree.speciesLabel')}</label>
                    {availableSpecies.length > 0 && (
                      <span className="species-count-badge">
                        {t('proposeTree.speciesCountBadge', { count: availableSpecies.length })}
                      </span>
                    )}
                  </div>
                  <SpeciesSelect
                    value={species}
                    onChange={setSpecies}
                    availableSpecies={availableSpecies}
                    isLoading={isLoadingSpecies}
                    placeholder={isLoadingSpecies ? t('proposeTree.catalogLoading') : t('proposeTree.speciesPlaceholderSearch')}
                    required
                    autoFocus
                  />
                </div>

                {/* Health & Watering Level */}
                <div className="form-row">
                  <div className="form-group">
                    <label>{t('proposeTree.healthLabel')}</label>
                    <select
                      value={healthLevel}
                      onChange={(e) => setHealthLevel(e.target.value as HealthLevel)}
                    >
                      <option value="EXCELLENT">{t('healthLevels.short_EXCELLENT')}</option>
                      <option value="GOOD">{t('healthLevels.short_GOOD')}</option>
                      <option value="FAIR">{t('healthLevels.short_FAIR')}</option>
                      <option value="POOR">{t('healthLevels.short_POOR')}</option>
                      <option value="CRITICAL">{t('healthLevels.short_CRITICAL')}</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>{t('proposeTree.wateringLabel')}</label>
                    <select
                      value={wateringLevel}
                      onChange={(e) => setWateringLevel(e.target.value as WateringLevel)}
                    >
                      <option value="OPTIMAL">{t('wateringLevels.short_OPTIMAL')}</option>
                      <option value="MODERATE">{t('wateringLevels.short_MODERATE')}</option>
                      <option value="LOW">{t('wateringLevels.short_LOW')}</option>
                      <option value="CRITICAL_DROUGHT">{t('wateringLevels.short_CRITICAL_DROUGHT')}</option>
                    </select>
                  </div>
                </div>

                {/* Tree metrics */}
                <div className="form-row three-cols">
                  <div className="form-group">
                    <label title={t('proposeTree.heightLabel')}>{t('proposeTree.heightShort')}</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder={t('proposeTree.heightPlaceholder')}
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label title={t('proposeTree.ageLabel')}>{t('proposeTree.ageShort')}</label>
                    <input
                      type="number"
                      placeholder={t('proposeTree.agePlaceholder')}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label title={t('proposeTree.trunkLabel')}>{t('proposeTree.trunkShort')}</label>
                    <input
                      type="number"
                      placeholder={t('proposeTree.trunkPlaceholder')}
                      value={trunkCircumference}
                      onChange={(e) => setTrunkCircumference(e.target.value)}
                    />
                  </div>
                </div>

                {/* Location Description */}
                <div className="form-group">
                  <label>{t('proposeTree.locationShort')}</label>
                  <input
                    type="text"
                    placeholder={t('proposeTree.locationPlaceholderShort')}
                    value={locationDescription}
                    onChange={(e) => setLocationDescription(e.target.value)}
                  />
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label>{t('proposeTree.notesShort')}</label>
                  <textarea
                    rows={2}
                    placeholder={t('proposeTree.notesPlaceholderShort')}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* Step 2 Actions */}
                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setStep(1)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <ArrowLeft size={16} />
                    <span>{t('proposeTree.backStep1Btn')}</span>
                  </button>
                  <button type="submit" className="submit-btn" disabled={isSubmitting}>
                    {isSubmitting ? t('proposeTree.submittingBtn') : t('proposeTree.submitBtn')}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
