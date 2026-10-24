import React, { useState, useEffect, useCallback } from 'react';
import { X, TreePine, Check, ArrowRight, ArrowLeft, MapPin } from 'lucide-react';
import type { TreeCreateRequest, HealthLevel, WateringLevel, SpeciesResponse } from '../types/tree';
import { GpsAdjusterMap } from './GpsAdjusterMap';
import { SpeciesSelect } from './SpeciesSelect';
import { getDistanceMetersPrecise } from '../utils/geo';
import { fetchAvailableSpecies } from '../services/species';

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
  const [step, setStep] = useState<1 | 2>(1);
  const [species, setSpecies] = useState('');
  const [availableSpecies, setAvailableSpecies] = useState<SpeciesResponse[]>([]);
  const [isLoadingSpecies, setIsLoadingSpecies] = useState(false);
  const [deviceBase, setDeviceBase] = useState<{ lat: number; lng: number }>(defaultCoords);
  const [adjustedPos, setAdjustedPos] = useState<{ lat: number; lng: number }>(defaultCoords);
  const [adjustmentMeters, setAdjustmentMeters] = useState(0);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'locating' | 'acquired' | 'fallback'>('locating');

  const [healthLevel, setHealthLevel] = useState<HealthLevel>('GOOD');
  const [wateringLevel, setWateringLevel] = useState<WateringLevel>('OPTIMAL');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [trunkCircumference, setTrunkCircumference] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Acquire high-precision device GPS on open
  const fetchDeviceGps = useCallback(() => {
    if (!navigator.geolocation) {
      setDeviceBase(defaultCoords);
      setAdjustedPos(defaultCoords);
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
        console.warn('Geolocation error during propose:', err.message);
        // Fallback to defaultCoords if user denied or outside
        setDeviceBase(defaultCoords);
        setAdjustedPos(defaultCoords);
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
  }, [defaultCoords]);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      fetchDeviceGps();
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
  }, [isOpen, fetchDeviceGps]);

  if (!isOpen) return null;

  const handlePositionChange = (pos: { lat: number; lng: number }, dist: number) => {
    setAdjustedPos(pos);
    setAdjustmentMeters(dist);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
            <h3>Propune un Arbore Nou</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {isSuccess ? (
          <div className="feedback-banner">
            <Check size={28} color="#059669" />
            <div>
              <strong>Arbore înregistrat cu succes!</strong>
              <p>Acesta a fost adăugat pe hartă și trimis spre verificare.</p>
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
                <span className="step-name">1. Ajustare Poziție GPS</span>
              </button>
              <div className="step-track" />
              <button
                type="button"
                className={`step-bubble ${step === 2 ? 'active' : ''}`}
                onClick={() => setStep(2)}
              >
                <span className="step-circle">2</span>
                <span className="step-name">2. Detalii Arbore</span>
              </button>
            </div>

            {step === 1 ? (
              /* --- STEP 1: ADJUST THE POSITION --- */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="step-instruction-box">
                  <strong>Pasul 1: Confirmă și ajustează poziția pe hartă</strong>
                  <p style={{ margin: '4px 0 0 0' }}>
                    Locația a fost preluată prin GPS-ul dispozitivului tău. Poți trage pinul verde pe hartă pentru o ajustare fină de până la <strong>1 metru</strong>.
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
                    <span className="coords-label">Latitudine</span>
                    <span className="coords-val">{adjustedPos.lat.toFixed(6)}</span>
                  </div>
                  <div className="coords-item">
                    <span className="coords-label">Longitudine</span>
                    <span className="coords-val">{adjustedPos.lng.toFixed(6)}</span>
                  </div>
                  <div className="coords-item">
                    <span className="coords-label">Ajustare fină</span>
                    <span className="coords-val highlight">
                      {adjustmentMeters.toFixed(2)} m / 1.0 m
                    </span>
                  </div>
                </div>

                <div className="modal-actions" style={{ marginTop: '8px' }}>
                  <button type="button" className="cancel-btn" onClick={onClose}>
                    Anulează
                  </button>
                  <button
                    type="button"
                    className="submit-btn"
                    onClick={() => setStep(2)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <span>Continuă la Pasul 2 (Detalii)</span>
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
                      Locație: <strong>{adjustedPos.lat.toFixed(5)}, {adjustedPos.lng.toFixed(5)}</strong>
                      {adjustmentMeters > 0 && (
                        <span className="dev-tag"> (ajustat {adjustmentMeters.toFixed(2)} m)</span>
                      )}
                    </span>
                  </div>
                  <button type="button" className="edit-pos-btn" onClick={() => setStep(1)}>
                    Modifică poziția
                  </button>
                </div>

                {/* Species selection with custom theme-matched dropdown */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ margin: 0 }}>Specie arbore (botanică sau comună) *</label>
                    {availableSpecies.length > 0 && (
                      <span className="species-count-badge">
                        {availableSpecies.length} specii în catalog
                      </span>
                    )}
                  </div>
                  <SpeciesSelect
                    value={species}
                    onChange={setSpecies}
                    availableSpecies={availableSpecies}
                    isLoading={isLoadingSpecies}
                    placeholder={isLoadingSpecies ? 'Se încarcă catalogul...' : 'Caută după nume comun sau științific (ex: Tei, Stejar, Platan...)'}
                    required
                    autoFocus
                  />
                </div>

                {/* Health & Watering Level */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Stare sănătate</label>
                    <select
                      value={healthLevel}
                      onChange={(e) => setHealthLevel(e.target.value as HealthLevel)}
                    >
                      <option value="EXCELLENT">Excelentă</option>
                      <option value="GOOD">Bună</option>
                      <option value="FAIR">Acceptabilă</option>
                      <option value="POOR">Precară</option>
                      <option value="CRITICAL">Critică</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Nivel umiditate</label>
                    <select
                      value={wateringLevel}
                      onChange={(e) => setWateringLevel(e.target.value as WateringLevel)}
                    >
                      <option value="OPTIMAL">Optim</option>
                      <option value="MODERATE">Moderat</option>
                      <option value="LOW">Scăzut</option>
                      <option value="CRITICAL_DROUGHT">Secetă critică</option>
                    </select>
                  </div>
                </div>

                {/* Tree metrics */}
                <div className="form-row three-cols">
                  <div className="form-group">
                    <label title="Înălțime în metri">Înălțime (m)</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Ex: 8.5"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label title="Vârstă estimată în ani">Vârstă (ani)</label>
                    <input
                      type="number"
                      placeholder="Ex: 25"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label title="Circumferință trunchi în centimetri">Circumf. (cm)</label>
                    <input
                      type="number"
                      placeholder="Ex: 110"
                      value={trunkCircumference}
                      onChange={(e) => setTrunkCircumference(e.target.value)}
                    />
                  </div>
                </div>

                {/* Location Description */}
                <div className="form-group">
                  <label>Reper / Descriere locație</label>
                  <input
                    type="text"
                    placeholder="Ex: Parcul Central, aleea spre gară lângă fântână"
                    value={locationDescription}
                    onChange={(e) => setLocationDescription(e.target.value)}
                  />
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label>Observații peisagistice</label>
                  <textarea
                    rows={2}
                    placeholder="Detalii despre coroană, frunze, sol..."
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
                    <span>Înapoi la Poziționare</span>
                  </button>
                  <button type="submit" className="submit-btn" disabled={isSubmitting}>
                    {isSubmitting ? 'Se salvează...' : 'Trimite Propunerea'}
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
