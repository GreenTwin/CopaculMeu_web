import React, { useState } from 'react';
import { X, Server, Database, Check, AlertCircle, RefreshCw, Globe, Navigation, Crosshair, Sun, Moon } from 'lucide-react';
import { AppConfig, getAppConfig, saveAppConfig } from '../services/config';
import { testBackendHost } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { Language } from '../i18n/translations';
import { RomaniaFlag, GreatBritainFlag } from './Flags';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged: (config: AppConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigChanged,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const currentConfig = getAppConfig();
  const [mode, setMode] = useState<'demo' | 'live'>(currentConfig.mode);
  const [backendHost, setBackendHost] = useState(currentConfig.backendHost);
  const [locationMode, setLocationMode] = useState<'live' | 'manual'>(currentConfig.locationMode || 'live');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Synchronize configuration whenever the modal opens
  React.useEffect(() => {
    if (isOpen) {
      const cfg = getAppConfig();
      setMode(cfg.mode);
      setBackendHost(cfg.backendHost);
      setLocationMode(cfg.locationMode || 'live');
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testBackendHost(backendHost);
    setTestResult(result);
    setTesting(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newConfig: AppConfig = {
      mode,
      backendHost: backendHost.trim() || 'http://localhost:8080',
      locationMode,
    };
    saveAppConfig(newConfig);
    onConfigChanged(newConfig);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <Server size={20} color="#10b981" />
            <h3>{t('settingsModal.modalTitle')}</h3>
          </div>
          <button className="close-btn" onClick={onClose} title={t('common.close')}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="checkin-form">
          {/* Language Selector */}
          <div className="form-group">
            <label className="section-title-label">
              <Globe size={16} />
              <span>{t('settingsModal.languageSectionTitle')}</span>
            </label>
            <p className="form-help-text" style={{ marginTop: 2, marginBottom: 8 }}>
              {t('settingsModal.languageSectionDesc')}
            </p>
            <div className="language-selector-grid">
              <button
                type="button"
                className={`language-option-card ${language === 'ro' ? 'selected' : ''}`}
                onClick={() => setLanguage('ro')}
              >
                <RomaniaFlag size={26} />
                <div className="lang-info">
                  <strong>Română</strong>
                  <span>Romanian</span>
                </div>
                {language === 'ro' && <Check size={16} className="lang-check" />}
              </button>

              <button
                type="button"
                className={`language-option-card ${language === 'en' ? 'selected' : ''}`}
                onClick={() => setLanguage('en')}
              >
                <GreatBritainFlag size={26} />
                <div className="lang-info">
                  <strong>English</strong>
                  <span>Engleză</span>
                </div>
                {language === 'en' && <Check size={16} className="lang-check" />}
              </button>
            </div>
          </div>

          {/* Interface & Map Theme Selector */}
          <div className="form-group">
            <label className="section-title-label">
              <Sun size={16} />
              <span>{t('settingsModal.themeSectionTitle')}</span>
            </label>
            <p className="form-help-text" style={{ marginTop: 2, marginBottom: 8 }}>
              {t('settingsModal.themeSectionDesc')}
            </p>
            <div className="theme-selector-grid">
              <button
                type="button"
                className={`theme-option-card ${theme === 'light' ? 'selected' : ''}`}
                onClick={() => setTheme('light')}
              >
                <div className="theme-card-icon-wrap light">
                  <Sun size={22} />
                </div>
                <div className="theme-info">
                  <strong>{t('settingsModal.themeLightTitle')}</strong>
                  <span>{t('settingsModal.themeLightDesc')}</span>
                </div>
                {theme === 'light' && <Check size={16} className="theme-check" />}
              </button>

              <button
                type="button"
                className={`theme-option-card ${theme === 'dark' ? 'selected' : ''}`}
                onClick={() => setTheme('dark')}
              >
                <div className="theme-card-icon-wrap dark">
                  <Moon size={22} />
                </div>
                <div className="theme-info">
                  <strong>{t('settingsModal.themeDarkTitle')}</strong>
                  <span>{t('settingsModal.themeDarkDesc')}</span>
                </div>
                {theme === 'dark' && <Check size={16} className="theme-check" />}
              </button>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="form-group">
            <label>{t('settingsModal.appModeSectionTitle')}</label>
            <div className="mode-selector-grid">
              <label
                className={`mode-option-card ${mode === 'demo' ? 'selected' : ''}`}
                onClick={() => setMode('demo')}
              >
                <div className="mode-radio-header">
                  <input
                    type="radio"
                    name="appMode"
                    checked={mode === 'demo'}
                    onChange={() => setMode('demo')}
                  />
                  <Database size={18} />
                  <strong>{t('settingsModal.demoModeTitle')}</strong>
                </div>
                <p>{t('settingsModal.demoModeDesc')}</p>
              </label>

              <label
                className={`mode-option-card ${mode === 'live' ? 'selected' : ''}`}
                onClick={() => setMode('live')}
              >
                <div className="mode-radio-header">
                  <input
                    type="radio"
                    name="appMode"
                    checked={mode === 'live'}
                    onChange={() => setMode('live')}
                  />
                  <Server size={18} />
                  <strong>{t('settingsModal.liveModeTitle')}</strong>
                </div>
                <p>{t('settingsModal.liveModeDesc')}</p>
              </label>
            </div>
          </div>

          {/* Location Tracking Selector */}
          <div className="form-group">
            <label className="section-title-label">
              <Navigation size={16} />
              <span>{t('settingsModal.locationSectionTitle')}</span>
            </label>
            <p className="form-help-text" style={{ marginTop: 2, marginBottom: 8 }}>
              {t('settingsModal.locationSectionDesc')}
            </p>
            <div className="mode-selector-grid">
              <label
                className={`mode-option-card ${locationMode === 'live' ? 'selected' : ''}`}
                onClick={() => setLocationMode('live')}
              >
                <div className="mode-radio-header">
                  <input
                    type="radio"
                    name="locationMode"
                    checked={locationMode === 'live'}
                    onChange={() => setLocationMode('live')}
                  />
                  <Navigation size={18} color="#2563eb" />
                  <strong>{t('settingsModal.locationLiveTitle')}</strong>
                </div>
                <p>{t('settingsModal.locationLiveDesc')}</p>
              </label>

              <label
                className={`mode-option-card ${locationMode === 'manual' ? 'selected' : ''}`}
                onClick={() => setLocationMode('manual')}
              >
                <div className="mode-radio-header">
                  <input
                    type="radio"
                    name="locationMode"
                    checked={locationMode === 'manual'}
                    onChange={() => setLocationMode('manual')}
                  />
                  <Crosshair size={18} color="#64748b" />
                  <strong>{t('settingsModal.locationManualTitle')}</strong>
                </div>
                <p>{t('settingsModal.locationManualDesc')}</p>
              </label>
            </div>
          </div>

          {/* Backend Host configuration */}
          <div className="form-group">
            <label>{t('settingsModal.hostLabel')}</label>
            <div className="host-input-row">
              <input
                type="text"
                required
                placeholder="Ex: http://localhost:8080"
                value={backendHost}
                onChange={(e) => setBackendHost(e.target.value)}
              />
              <button
                type="button"
                className="test-conn-btn"
                onClick={handleTestConnection}
                disabled={testing}
              >
                <RefreshCw size={14} className={testing ? 'rotating' : ''} />
                <span>{testing ? t('settingsModal.testingBtn') : t('settingsModal.testConnBtn')}</span>
              </button>
            </div>
            <span className="form-help-text">
              {t('settingsModal.hostHelpText')}
            </span>
          </div>

          {/* Test connection feedback */}
          {testResult && (
            <div
              className={`connection-test-banner ${
                testResult.ok ? 'test-success' : 'test-failed'
              }`}
            >
              {testResult.ok ? (
                <Check size={18} color="#059669" />
              ) : (
                <AlertCircle size={18} color="#dc2626" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              {t('settingsModal.cancelBtn')}
            </button>
            <button type="submit" className="submit-btn">
              {t('settingsModal.saveAndApplyBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
