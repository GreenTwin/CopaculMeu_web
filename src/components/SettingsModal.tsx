import React, { useState } from 'react';
import { X, Server, Database, Check, AlertCircle, RefreshCw, Globe } from 'lucide-react';
import { AppConfig, getAppConfig, saveAppConfig } from '../services/config';
import { testBackendHost } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
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
  const currentConfig = getAppConfig();
  const [selectedLang, setSelectedLang] = useState<Language>(language);
  const [mode, setMode] = useState<'demo' | 'live'>(currentConfig.mode);
  const [backendHost, setBackendHost] = useState(currentConfig.backendHost);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

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
    if (selectedLang !== language) {
      setLanguage(selectedLang);
    }
    const newConfig: AppConfig = {
      mode,
      backendHost: backendHost.trim() || 'http://localhost:8080',
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
                className={`language-option-card ${selectedLang === 'ro' ? 'selected' : ''}`}
                onClick={() => setSelectedLang('ro')}
              >
                <RomaniaFlag size={26} />
                <div className="lang-info">
                  <strong>Română</strong>
                  <span>Romanian</span>
                </div>
                {selectedLang === 'ro' && <Check size={16} className="lang-check" />}
              </button>

              <button
                type="button"
                className={`language-option-card ${selectedLang === 'en' ? 'selected' : ''}`}
                onClick={() => setSelectedLang('en')}
              >
                <GreatBritainFlag size={26} />
                <div className="lang-info">
                  <strong>English</strong>
                  <span>Engleză</span>
                </div>
                {selectedLang === 'en' && <Check size={16} className="lang-check" />}
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
