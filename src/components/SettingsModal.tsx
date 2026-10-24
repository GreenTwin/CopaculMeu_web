import React, { useState } from 'react';
import { X, Server, Database, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { AppConfig, getAppConfig, saveAppConfig } from '../services/config';
import { testBackendHost } from '../services/api';

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
  const currentConfig = getAppConfig();
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
            <h3>Configurare Sursă Date & Backend</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="checkin-form">
          {/* Mode Selector */}
          <div className="form-group">
            <label>Mod de funcționare aplicație:</label>
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
                  <strong>Mod Demo (Curated)</strong>
                </div>
                <p>
                  Încarcă catalogul realist de arbori din parcurile Timișoarei. Ideal pentru
                  prezentări, testare UI și demonstrații offline.
                </p>
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
                  <strong>Server Backend Live</strong>
                </div>
                <p>
                  Efectuează apeluri REST reale către serverul Spring Boot configurat mai jos.
                </p>
              </label>
            </div>
          </div>

          {/* Backend Host configuration */}
          <div className="form-group">
            <label>Adresă Server Backend REST (Host):</label>
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
                <span>{testing ? 'Testare...' : 'Testează Conexiunea'}</span>
              </button>
            </div>
            <span className="form-help-text">
              Punctul de intrare REST pentru apeluri precum <code>/api/trees/area</code> și <code>/api/trees/{'{id}'}/check-ins</code>.
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
              Anulează
            </button>
            <button type="submit" className="submit-btn">
              Salvează & Aplică
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
