import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  TreePine,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  AlertCircle,
  Loader2,
  Sparkles,
  MailCheck,
  CheckCircle2,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { confirmEmailCode, resendActivationCode } from '../services/auth';

export const AuthModal: React.FC = () => {
  const { t } = useLanguage();
  const {
    isAuthModalOpen,
    authModalTab,
    authContextMessage,
    closeAuthModal,
    login,
    register,
    openAuthModal,
  } = useAuth();

  // Tab & View state: 'login' | 'register' | 'confirm_email'
  const isConfirmEmail = authModalTab === 'confirm_email';
  const isLogin = authModalTab === 'login';

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Email Confirmation states
  const [pendingUser, setPendingUser] = useState<{ email: string; password: string; name: string } | null>(null);
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '', '', '']);
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [isConfirmedSuccess, setIsConfirmedSuccess] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Auto-focus first pin input when transitioning to confirm_email view
  useEffect(() => {
    if (isConfirmEmail && !isConfirmedSuccess) {
      setTimeout(() => {
        pinInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isConfirmEmail, isConfirmedSuccess]);

  if (!isAuthModalOpen) return null;

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setErrorMessage(null);
    setResendNotice(null);
    setIsConfirmedSuccess(false);
    setPinDigits(['', '', '', '', '', '']);
  };

  const handleSwitchTab = (tab: 'login' | 'register') => {
    resetForm();
    openAuthModal(tab);
  };

  // Submission for Login or Register
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isLogin) {
      if (!email.trim() || !password) {
        setErrorMessage(t('authModal.fillEmailAndPassword'));
        return;
      }

      setIsSubmitting(true);
      try {
        await login({ email: email.trim(), password });
        resetForm();
      } catch (err) {
        const msg = err instanceof Error ? err.message : t('authModal.loginFailed');
        setErrorMessage(msg);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Register validation
      if (!name.trim()) {
        setErrorMessage(t('authModal.fillName'));
        return;
      }
      if (!email.trim()) {
        setErrorMessage(t('authModal.fillEmail'));
        return;
      }
      if (password.length < 8) {
        setErrorMessage(t('authModal.passwordMin8'));
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage(t('authModal.passwordsDoNotMatch'));
        return;
      }

      setIsSubmitting(true);
      try {
        await register({
          name: name.trim(),
          email: email.trim(),
          password,
        });

        // Store pending credentials and show Email Confirmation Screen!
        setPendingUser({
          name: name.trim(),
          email: email.trim(),
          password,
        });
        setPinDigits(['', '', '', '', '', '']);
        setResendCooldown(60);
        openAuthModal('confirm_email');
      } catch (err) {
        const msg = err instanceof Error ? err.message : t('authModal.registerFailed');
        setErrorMessage(msg);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // --- PIN CODE INPUT HANDLERS ---
  const handlePinChange = (index: number, val: string) => {
    // Only accept numeric characters
    const cleanVal = val.replace(/\D/g, '');
    if (!cleanVal && val !== '') return;

    const newDigits = [...pinDigits];

    if (cleanVal.length > 1) {
      // Multi-character input (e.g. mobile auto-fill or fast typing)
      const chars = cleanVal.slice(0, 6).split('');
      chars.forEach((c, i) => {
        if (index + i < 6) newDigits[index + i] = c;
      });
      setPinDigits(newDigits);
      const nextIdx = Math.min(5, index + chars.length);
      pinInputRefs.current[nextIdx]?.focus();
      return;
    }

    newDigits[index] = cleanVal;
    setPinDigits(newDigits);

    // Auto-focus next input
    if (cleanVal && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...pinDigits];
    pasted.split('').forEach((char, i) => {
      newDigits[i] = char;
    });
    setPinDigits(newDigits);

    const focusIdx = Math.min(5, pasted.length);
    pinInputRefs.current[focusIdx]?.focus();
  };

  // Confirm code and activate account
  const handleConfirmCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = pinDigits.join('');
    if (code.length !== 6) {
      setErrorMessage(t('authModal.enterAllDigits'));
      return;
    }

    const targetEmail = pendingUser?.email || email;
    const targetPassword = pendingUser?.password || password;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await confirmEmailCode(targetEmail, code);

      // Authenticate user with their credentials to activate the session
      if (targetPassword) {
        await login({ email: targetEmail, password: targetPassword });
      }

      setIsConfirmedSuccess(true);

      // Auto close after brief celebration
      setTimeout(() => {
        closeAuthModal();
        resetForm();
      }, 1800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('authModal.invalidOrExpiredCode');
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend code handler
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    const targetEmail = pendingUser?.email || email;
    try {
      await resendActivationCode(targetEmail);
      setResendNotice(t('authModal.resendSuccess', { email: targetEmail }));
      setResendCooldown(60);
      setErrorMessage(null);
    } catch {
      setErrorMessage(t('authModal.resendError'));
    }
  };

  // Quick helper for demo volunteer login
  const handleQuickDemoLogin = async () => {
    setEmail('voluntar.timisoara@copaculmeu.ro');
    setPassword('DemoParola123!');
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await login({
        email: 'voluntar.timisoara@copaculmeu.ro',
        password: 'DemoParola123!',
      });
      resetForm();
    } catch {
      setErrorMessage(t('authModal.demoLoginFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={closeAuthModal}>
      <div className="modal-card auth-modal" onClick={(e) => e.stopPropagation()}>
        {/* --- VIEW 1 & 2: LOGIN / REGISTER --- */}
        {!isConfirmEmail ? (
          <>
            {/* Header */}
            <div className="modal-header auth-modal-header">
              <div className="auth-brand-badge">
                <TreePine size={24} color="#059669" />
              </div>
              <div className="auth-header-text">
                <h3>{isLogin ? t('authModal.signInTitle') : t('authModal.registerTitle')}</h3>
                <p>{t('authModal.subtitle')}</p>
              </div>
              <button className="close-btn" onClick={closeAuthModal} title={t('common.close')}>
                <X size={18} />
              </button>
            </div>

            {/* Contextual requirement notice banner */}
            {authContextMessage && (
              <div className="auth-context-banner">
                <Lock size={16} className="auth-context-icon" />
                <span>{authContextMessage}</span>
              </div>
            )}

            {/* Tab Switcher */}
            <div className="auth-tabs-container">
              <button
                type="button"
                className={`auth-tab-btn ${isLogin ? 'active' : ''}`}
                onClick={() => handleSwitchTab('login')}
              >
                <LogIn size={16} />
                <span>{t('authModal.signInTab')}</span>
              </button>
              <button
                type="button"
                className={`auth-tab-btn ${!isLogin ? 'active' : ''}`}
                onClick={() => handleSwitchTab('register')}
              >
                <UserPlus size={16} />
                <span>{t('authModal.registerTab')}</span>
              </button>
            </div>

            {/* Error message alert banner */}
            {errorMessage && (
              <div className="auth-error-banner">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="auth-form">
              {!isLogin && (
                <div className="form-group">
                  <label htmlFor="auth-name">{t('authModal.nameLabel')}</label>
                  <div className="auth-input-wrapper">
                    <UserIcon size={17} className="auth-field-icon" />
                    <input
                      id="auth-name"
                      type="text"
                      placeholder={t('authModal.namePlaceholder')}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="auth-email">{t('authModal.emailLabel')}</label>
                <div className="auth-input-wrapper">
                  <Mail size={17} className="auth-field-icon" />
                  <input
                    id="auth-email"
                    type="email"
                    placeholder={t('authModal.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus={isLogin}
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="auth-label-row">
                  <label htmlFor="auth-password" style={{ margin: 0 }}>
                    {t('authModal.passwordLabel')}
                  </label>
                  {!isLogin && <span className="auth-hint">{t('authModal.passwordHint')}</span>}
                </div>
                <div className="auth-input-wrapper">
                  <Lock size={17} className="auth-field-icon" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={isLogin ? t('authModal.passwordPlaceholder') : t('authModal.passwordHint')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? t('authModal.hidePassword') : t('authModal.showPassword')}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div className="form-group">
                  <label htmlFor="auth-confirm-password">{t('authModal.confirmPasswordLabel')}</label>
                  <div className="auth-input-wrapper">
                    <Lock size={17} className="auth-field-icon" />
                    <input
                      id="auth-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder={t('authModal.confirmPasswordPlaceholderRepeat')}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="auth-eye-btn"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      title={showConfirmPassword ? t('authModal.hidePassword') : t('authModal.showPassword')}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Submit CTA */}
              <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="rotating" />
                    <span>{isLogin ? t('authModal.signingInBtn') : t('authModal.registeringBtn')}</span>
                  </>
                ) : (
                  <>
                    {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                    <span>{isLogin ? t('authModal.signInActionBtn') : t('authModal.registerActionBtn')}</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer switch & demo helper */}
            <div className="auth-modal-footer">
              {isLogin ? (
                <p className="auth-switch-text">
                  {t('authModal.noAccountText')}{' '}
                  <button
                    type="button"
                    className="auth-link-btn"
                    onClick={() => handleSwitchTab('register')}
                  >
                    {t('authModal.registerFreeLink')}
                  </button>
                </p>
              ) : (
                <p className="auth-switch-text">
                  {t('authModal.hasAccountText')}{' '}
                  <button
                    type="button"
                    className="auth-link-btn"
                    onClick={() => handleSwitchTab('login')}
                  >
                    {t('authModal.signInLink')}
                  </button>
                </p>
              )}

              {isLogin && (
                <div className="auth-quick-demo-box">
                  <button
                    type="button"
                    className="quick-demo-btn"
                    onClick={handleQuickDemoLogin}
                    disabled={isSubmitting}
                    title={t('authModal.demoVolunteerTooltip')}
                  >
                    <Sparkles size={14} color="#059669" />
                    <span>{t('authModal.quickDemoBtn')}</span>
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          /* --- VIEW 3: EMAIL CONFIRMATION CODE SCREEN --- */
          <div className="auth-confirm-container">
            {isConfirmedSuccess ? (
              <div className="auth-success-screen">
                <div className="auth-confirmed-success-icon">
                  <CheckCircle2 size={48} color="#059669" />
                </div>
                <h4 className="auth-confirm-title">{t('authModal.accountActivatedTitle')}</h4>
                <p className="auth-confirm-subtitle">
                  {t('authModal.accountActivatedDesc', { name: pendingUser?.name ? `, ${pendingUser.name}` : '' })}
                </p>
                <div className="auth-success-progress-hint">
                  <Loader2 size={16} className="rotating" color="#059669" />
                  <span>{t('authModal.autoConnecting')}</span>
                </div>
              </div>
            ) : (
              <>
                {/* Header Back & Close */}
                <div className="auth-confirm-header-bar">
                  <button
                    type="button"
                    className="auth-back-link"
                    onClick={() => {
                      setErrorMessage(null);
                      openAuthModal('register');
                    }}
                    title={t('authModal.backToRegisterTooltip')}
                  >
                    <ArrowLeft size={16} />
                    <span>{t('authModal.backBtn')}</span>
                  </button>
                  <button className="close-btn" onClick={closeAuthModal} title={t('common.close')}>
                    <X size={18} />
                  </button>
                </div>

                {/* Animated Mail Badge */}
                <div className="auth-confirm-badge">
                  <MailCheck size={28} />
                </div>

                <h3 className="auth-confirm-title">{t('authModal.confirmEmailTitle')}</h3>

                <p className="auth-confirm-subtitle">
                  {t('authModal.confirmEmailDesc')}
                </p>

                <div className="auth-confirm-email-tag">
                  <Mail size={14} color="#059669" />
                  <span>{pendingUser?.email || email}</span>
                  <button
                    type="button"
                    className="auth-edit-email-btn"
                    onClick={() => openAuthModal('register')}
                    title={t('authModal.modifyEmailTooltip')}
                  >
                    {t('authModal.modifyEmail')}
                  </button>
                </div>

                {/* Notifications & Error messages */}
                {resendNotice && (
                  <div className="auth-notice-banner">
                    <CheckCircle2 size={15} color="#059669" />
                    <span>{resendNotice}</span>
                  </div>
                )}

                {errorMessage && (
                  <div className="auth-error-banner" style={{ margin: '12px 0 0', width: '100%' }}>
                    <AlertCircle size={16} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* 6-Digit PIN Form */}
                <form onSubmit={handleConfirmCodeSubmit} className="auth-pin-form">
                  <label className="auth-pin-label">{t('authModal.enterPinLabel')}</label>

                  <div className="auth-pin-inputs-row" onPaste={handlePinPaste}>
                    {pinDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => {
                          pinInputRefs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        className={`auth-pin-digit-box ${digit ? 'filled' : ''}`}
                        value={digit}
                        onChange={(e) => handlePinChange(index, e.target.value)}
                        onKeyDown={(e) => handlePinKeyDown(index, e)}
                        autoComplete="one-time-code"
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="auth-confirm-submit-btn"
                    disabled={isSubmitting || pinDigits.join('').length < 6}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="rotating" />
                        <span>{t('authModal.verifyingBtn')}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        <span>{t('authModal.verifyAndActivateBtn')}</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Resend actions */}
                <div className="auth-resend-row">
                  <span>{t('authModal.notReceivedEmail')}</span>
                  {resendCooldown > 0 ? (
                    <span className="auth-cooldown-text">
                      {t('authModal.resendInSeconds', { seconds: resendCooldown })}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="auth-resend-btn"
                      onClick={handleResend}
                      disabled={isSubmitting}
                    >
                      <RotateCcw size={13} />
                      <span>{t('authModal.resendCodeBtn')}</span>
                    </button>
                  )}
                </div>

                <div className="auth-test-hint">
                  {t('authModal.testHint')}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
