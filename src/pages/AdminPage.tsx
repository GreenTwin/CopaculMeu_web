import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ShieldCheck,
  TreePine,
  CheckCircle2,
  XCircle,
  Users,
  Mail,
  Plus,
  Loader2,
  AlertCircle,
  MapPin,
  Calendar,
  Ruler,
  Droplets,
  HeartPulse,
  RefreshCw,
  Edit2,
  Save,
  Search,
  Ban,
  RotateCcw,
  Clock,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  ArrowLeft,
  LogOut,
  Sun,
  Moon,
  Sparkles,
  Layers,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { RomaniaFlag, GreatBritainFlag } from '../components/Flags';
import type { TreeResponse, SpeciesResponse } from '../types/tree';
import type { User } from '../types/auth';
import type { EmailTemplateResponse } from '../types/admin';
import { fetchAvailableSpecies } from '../services/species';
import {
  fetchPendingTreeProposals,
  approveTreeProposal,
  rejectTreeProposal,
  createSpeciesAsAdmin,
  fetchAdminUsers,
  approveAdminUser,
  updateAdminUserStatus,
  fetchEmailTemplates,
  updateEmailTemplate,
} from '../services/admin';
import { navigateTo } from '../utils/navigation';

export type AdminTab = 'users' | 'proposals' | 'species' | 'emails';

interface AdminPageProps {
  currentPath: string;
}

export const AdminPage: React.FC<AdminPageProps> = ({ currentPath }) => {
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  // Determine active tab from URL path
  const activeTab: AdminTab = useMemo(() => {
    if (currentPath.includes('/admin/proposals')) return 'proposals';
    if (currentPath.includes('/admin/species')) return 'species';
    if (currentPath.includes('/admin/emails')) return 'emails';
    return 'users';
  }, [currentPath]);

  const handleTabChange = (tab: AdminTab) => {
    navigateTo(`/admin/${tab}`);
  };

  // --- Tab 1: Users State ---
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userStatusFilter, setUserStatusFilter] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('');
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [userFeedback, setUserFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  // --- Tab 2: Proposals State ---
  const [proposals, setProposals] = useState<TreeResponse[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [rejectPromptId, setRejectPromptId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [proposalFeedback, setProposalFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  // --- Tab 3: Species State ---
  const [speciesList, setSpeciesList] = useState<SpeciesResponse[]>([]);
  const [loadingSpeciesList, setLoadingSpeciesList] = useState(false);
  const [searchSpeciesQuery, setSearchSpeciesQuery] = useState('');
  const [showAddSpeciesForm, setShowAddSpeciesForm] = useState(false);
  const [speciesScientific, setSpeciesScientific] = useState('');
  const [speciesCommon, setSpeciesCommon] = useState('');
  const [speciesAliases, setSpeciesAliases] = useState('');
  const [speciesLoading, setSpeciesLoading] = useState(false);
  const [speciesFeedback, setSpeciesFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  // --- Tab 4: Email Templates State ---
  const [templates, setTemplates] = useState<EmailTemplateResponse[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateResponse | null>(null);
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateFeedback, setTemplateFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [lastFocusedField, setLastFocusedField] = useState<'subject' | 'body'>('body');

  const handleInsertPlaceholder = (placeholder: string) => {
    const isSubject = lastFocusedField === 'subject';
    const element = isSubject ? subjectInputRef.current : bodyTextareaRef.current;

    if (!element) {
      setTemplateBody((prev) => prev + placeholder);
      return;
    }

    const start = element.selectionStart ?? element.value.length;
    const end = element.selectionEnd ?? element.value.length;
    const currentValue = element.value;

    const newValue = currentValue.substring(0, start) + placeholder + currentValue.substring(end);

    if (isSubject) {
      setTemplateSubject(newValue);
    } else {
      setTemplateBody(newValue);
    }

    // Maintain focus and set cursor position immediately after the inserted placeholder
    requestAnimationFrame(() => {
      element.focus();
      const newCursorPos = start + placeholder.length;
      element.setSelectionRange(newCursorPos, newCursorPos);
    });
  };

  // --- Loaders ---
  const loadUsers = useCallback(
    async (
      targetPage = 0,
      statusFilter = userStatusFilter,
      roleFilter = userRoleFilter
    ) => {
      setLoadingUsers(true);
      setUserFeedback(null);
      try {
        const res = await fetchAdminUsers({
          page: targetPage,
          size: pageSize,
          status: statusFilter || undefined,
          role: roleFilter || undefined,
        });
        setUsers(res.content || []);
        setTotalPages(res.totalPages || 1);
        setTotalElements(res.totalElements || (res.content ? res.content.length : 0));
        setPage(targetPage);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Eroare la încărcarea utilizatorilor';
        setUserFeedback({ ok: false, msg });
      } finally {
        setLoadingUsers(false);
      }
    },
    [pageSize, userStatusFilter, userRoleFilter]
  );

  const loadProposals = useCallback(async () => {
    setLoadingProposals(true);
    setProposalFeedback(null);
    try {
      const data = await fetchPendingTreeProposals();
      setProposals(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Eroare la încărcarea propunerilor';
      setProposalFeedback({ ok: false, msg });
    } finally {
      setLoadingProposals(false);
    }
  }, []);

  const loadSpecies = useCallback(async (force = false) => {
    setLoadingSpeciesList(true);
    try {
      const list = await fetchAvailableSpecies(force);
      setSpeciesList(list || []);
    } catch (err: unknown) {
      console.warn('Eroare la încărcarea catalogului de specii:', err);
    } finally {
      setLoadingSpeciesList(false);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    setTemplateFeedback(null);
    try {
      const list = await fetchEmailTemplates();
      setTemplates(list);
      if (list.length > 0 && !selectedTemplate) {
        setSelectedTemplate(list[0]);
        setTemplateSubject(list[0].subject);
        setTemplateBody(list[0].body);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Eroare la încărcarea șabloanelor';
      setTemplateFeedback({ ok: false, msg });
    } finally {
      setLoadingTemplates(false);
    }
  }, [selectedTemplate]);

  // Initial load when tab or auth changes
  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN') {
      if (activeTab === 'users') loadUsers(0);
      else if (activeTab === 'proposals') loadProposals();
      else if (activeTab === 'species') loadSpecies();
      else if (activeTab === 'emails') loadTemplates();
    }
  }, [activeTab, isAuthenticated, user?.role, loadUsers, loadProposals, loadSpecies, loadTemplates]);

  // Filtered users for search query
  const filteredUsers = useMemo(() => {
    if (!searchUserQuery.trim()) return users;
    const q = searchUserQuery.toLowerCase().trim();
    return users.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
  }, [users, searchUserQuery]);

  // Filtered species for catalog search
  const filteredSpecies = useMemo(() => {
    if (!searchSpeciesQuery.trim()) return speciesList;
    const q = searchSpeciesQuery.toLowerCase().trim();
    return speciesList.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.commonName && s.commonName.toLowerCase().includes(q)) ||
        (s.scientificName && s.scientificName.toLowerCase().includes(q)) ||
        (s.aliases && s.aliases.toLowerCase().includes(q))
    );
  }, [speciesList, searchSpeciesQuery]);

  // Guard: Unauthorized View
  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="admin-page-denied-container">
        <div className="admin-page-denied-card">
          <div className="admin-denied-icon-wrap">
            <Ban size={48} color="#dc2626" />
          </div>
          <h2>{t('admin.accessDeniedTitle')}</h2>
          <p>{t('admin.accessDeniedDesc')}</p>
          <div className="admin-denied-actions">
            {!isAuthenticated ? (
              <button
                type="button"
                className="admin-denied-login-btn"
                onClick={() => openAuthModal('login')}
              >
                <ShieldCheck size={16} />
                <span>{t('header.authBtn')}</span>
              </button>
            ) : null}
            <button
              type="button"
              className="admin-denied-back-btn"
              onClick={() => navigateTo('/')}
            >
              <ArrowLeft size={16} />
              <span>{t('admin.backToMap')}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Tab 1: User Actions ---
  const handleApproveUser = async (targetUser: User) => {
    setApprovingUserId(targetUser.id);
    setUserFeedback(null);
    try {
      await approveAdminUser(targetUser.id);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, status: 'ACTIVE' } : u))
      );
      setUserFeedback({
        ok: true,
        msg: t('admin.statusChangedSuccess', {
          name: targetUser.name || targetUser.email,
          status: t('admin.statusActive'),
        }),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Eroare la aprobarea utilizatorului';
      setUserFeedback({ ok: false, msg });
    } finally {
      setApprovingUserId(null);
    }
  };

  const handleSetUserStatus = async (
    targetUser: User,
    newStatus: 'ACTIVE' | 'UNCONFIRMED' | 'SUSPENDED'
  ) => {
    if (targetUser.status === newStatus) return;
    setUpdatingUserId(targetUser.id);
    setUserFeedback(null);
    try {
      const updated = await updateAdminUserStatus(targetUser.id, newStatus);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id ? { ...u, status: updated.status || newStatus } : u
        )
      );
      const statusLabel =
        newStatus === 'ACTIVE'
          ? t('admin.statusActive')
          : newStatus === 'SUSPENDED'
            ? t('admin.statusSuspended')
            : t('admin.statusUnconfirmed');
      setUserFeedback({
        ok: true,
        msg: t('admin.statusChangedSuccess', {
          name: targetUser.name || targetUser.email,
          status: statusLabel,
        }),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Eroare la actualizarea statusului';
      setUserFeedback({ ok: false, msg });
    } finally {
      setUpdatingUserId(null);
    }
  };

  // --- Tab 2: Proposal Actions ---
  const handleApprove = async (tree: TreeResponse) => {
    setActioningId(tree.id);
    setProposalFeedback(null);
    try {
      await approveTreeProposal(tree.id);
      setProposals((prev) => prev.filter((p) => p.id !== tree.id));
      setProposalFeedback({
        ok: true,
        msg: `Arborele #${tree.id} (${tree.species}) a fost aprobat cu succes!`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Eroare la aprobarea arborelui';
      setProposalFeedback({ ok: false, msg });
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (tree: TreeResponse) => {
    setActioningId(tree.id);
    setProposalFeedback(null);
    try {
      const reason = rejectReason.trim() || 'Neconformitate standarde municipale';
      await rejectTreeProposal(tree.id, reason);
      setProposals((prev) => prev.filter((p) => p.id !== tree.id));
      setRejectPromptId(null);
      setRejectReason('');
      setProposalFeedback({ ok: true, msg: `Propunerea #${tree.id} a fost respinsă.` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Eroare la respingerea arborelui';
      setProposalFeedback({ ok: false, msg });
    } finally {
      setActioningId(null);
    }
  };

  // --- Tab 3: Species Submit ---
  const handleCreateSpecies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!speciesScientific.trim() || !speciesCommon.trim()) return;

    setSpeciesLoading(true);
    setSpeciesFeedback(null);
    const fullName = `${speciesScientific.trim()} (${speciesCommon.trim()})`;
    try {
      await createSpeciesAsAdmin({
        name: fullName,
        scientificName: speciesScientific.trim(),
        commonName: speciesCommon.trim(),
        aliases: speciesAliases.trim() || undefined,
      });
      setSpeciesFeedback({
        ok: true,
        msg: `Specia „${fullName}” a fost adăugată cu succes în catalog!`,
      });
      setSpeciesScientific('');
      setSpeciesCommon('');
      setSpeciesAliases('');
      await loadSpecies(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Eroare la adăugarea speciei';
      setSpeciesFeedback({ ok: false, msg });
    } finally {
      setSpeciesLoading(false);
    }
  };

  // --- Tab 4: Template Save ---
  const handleSelectTemplate = (tObj: EmailTemplateResponse) => {
    setSelectedTemplate(tObj);
    setTemplateSubject(tObj.subject);
    setTemplateBody(tObj.body);
    setTemplateFeedback(null);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    setSavingTemplate(true);
    setTemplateFeedback(null);
    try {
      const updated = await updateEmailTemplate(
        selectedTemplate.id || selectedTemplate.name,
        {
          subject: templateSubject,
          body: templateBody,
          description: selectedTemplate.description,
        }
      );
      setSelectedTemplate(updated);
      setTemplates((prev) =>
        prev.map((tpl) => (tpl.id === updated.id ? updated : tpl))
      );
      setTemplateFeedback({ ok: true, msg: 'Șablonul a fost actualizat cu succes!' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Eroare la actualizarea șablonului';
      setTemplateFeedback({ ok: false, msg });
    } finally {
      setSavingTemplate(false);
    }
  };

  const adminInitials = (user.name || user.email)
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0].toUpperCase())
    .slice(0, 2)
    .join('') || 'A';

  return (
    <div className="admin-page-layout">
      {/* ===================================================================== */}
      {/* LEFT NAVIGATION SIDEBAR */}
      {/* ===================================================================== */}
      <aside className="admin-sidebar">
        {/* Brand */}
        <div className="admin-sidebar-header">
          <div className="admin-brand-icon">
            <TreePine size={22} color="#10b981" />
          </div>
          <div className="admin-brand-info">
            <span className="admin-brand-title">{t('admin.adminPortalTitle')}</span>
            <span className="admin-brand-sub">{t('admin.adminPortalSubtitle')}</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="admin-sidebar-menu">
          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => handleTabChange('users')}
          >
            <Users size={18} />
            <span className="admin-nav-label">{t('admin.tabUsers')}</span>
            {totalElements > 0 && (
              <span className="admin-badge-count">{totalElements}</span>
            )}
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'proposals' ? 'active' : ''}`}
            onClick={() => handleTabChange('proposals')}
          >
            <TreePine size={18} />
            <span className="admin-nav-label">{t('admin.tabProposals')}</span>
            {proposals.length > 0 && (
              <span className="admin-badge-count pending">{proposals.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'species' ? 'active' : ''}`}
            onClick={() => handleTabChange('species')}
          >
            <Plus size={18} />
            <span className="admin-nav-label">{t('admin.tabSpecies')}</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'emails' ? 'active' : ''}`}
            onClick={() => handleTabChange('emails')}
          >
            <Mail size={18} />
            <span className="admin-nav-label">{t('admin.tabEmails')}</span>
          </button>

          <div className="admin-nav-divider" />

          {/* Quick link back to the public map */}
          <button
            type="button"
            className="admin-nav-item admin-nav-back-to-map"
            onClick={() => navigateTo('/')}
          >
            <ArrowLeft size={18} />
            <span className="admin-nav-label">{t('admin.backToMap')}</span>
          </button>
        </nav>

        {/* Sidebar Footer / User Profile */}
        <div className="admin-sidebar-footer">
          <div className="admin-user-profile-box">
            <div className="admin-avatar-sidebar">{adminInitials}</div>
            <div className="admin-user-profile-info">
              <strong className="admin-profile-name">{user.name || 'Administrator'}</strong>
              <span className="admin-profile-email">{user.email}</span>
              <span className="admin-pill-tag">ADMIN</span>
            </div>
            <button
              type="button"
              className="admin-sidebar-logout-btn"
              onClick={logout}
              title="Deconectare"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ===================================================================== */}
      {/* MAIN VIEWPORT AREA */}
      {/* ===================================================================== */}
      <div className="admin-content-wrapper">
        {/* Top bar */}
        <header className="admin-topbar">
          <div className="admin-topbar-breadcrumb">
            <span className="admin-breadcrumb-root">{t('admin.adminPortalTitle')}</span>
            <span className="admin-breadcrumb-sep">/</span>
            <span className="admin-breadcrumb-current">
              {activeTab === 'users' && t('admin.tabUsers')}
              {activeTab === 'proposals' && t('admin.tabProposals')}
              {activeTab === 'species' && t('admin.tabSpecies')}
              {activeTab === 'emails' && t('admin.tabEmails')}
            </span>
          </div>

          <div className="admin-topbar-actions">
            {/* Link to public map */}
            <button
              type="button"
              className="admin-topbar-map-link"
              onClick={() => navigateTo('/')}
            >
              <MapPin size={15} color="#10b981" />
              <span>{t('admin.backToMap')}</span>
            </button>

            {/* Language toggle */}
            <div className="lang-toggle-pill">
              <button
                type="button"
                className={`lang-pill-btn ${language === 'ro' ? 'active' : ''}`}
                onClick={() => setLanguage('ro')}
              >
                <RomaniaFlag size={13} />
                <span className="lang-code">RO</span>
              </button>
              <button
                type="button"
                className={`lang-pill-btn ${language === 'en' ? 'active' : ''}`}
                onClick={() => setLanguage('en')}
              >
                <GreatBritainFlag size={13} />
                <span className="lang-code">EN</span>
              </button>
            </div>

            {/* Theme toggle */}
            <button
              type="button"
              className={`theme-toggle-btn ${theme}`}
              onClick={toggleTheme}
              title={t('header.themeToggleTooltip')}
            >
              {theme === 'dark' ? (
                <Sun size={17} className="theme-toggle-icon theme-sun" />
              ) : (
                <Moon size={17} className="theme-toggle-icon theme-moon" />
              )}
            </button>
          </div>
        </header>

        {/* Main Body Content */}
        <main className="admin-main-viewport">
          {/* =============================================================== */}
          {/* SECTION: USERS */}
          {/* =============================================================== */}
          {activeTab === 'users' && (
            <div className="admin-view-container">
              {/* Header Box */}
              <div className="admin-view-header">
                <div>
                  <h2 className="admin-view-title">{t('admin.tabUsers')}</h2>
                  <p className="admin-view-desc">{t('admin.usersSubtitle')}</p>
                </div>
              </div>

              {/* Toolbar */}
              <div className="admin-tab-toolbar admin-users-toolbar">
                <div className="admin-search-box">
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder={t('admin.searchUserPlaceholder')}
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                  />
                  {searchUserQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchUserQuery('')}
                      className="admin-search-clear"
                      title={t('common.close')}
                    >
                      <XCircle size={14} />
                    </button>
                  )}
                </div>

                <div className="admin-toolbar-filters">
                  <div className="admin-filter-group">
                    <label>{t('admin.filterStatusLabel')}:</label>
                    <select
                      value={userStatusFilter}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUserStatusFilter(val);
                        loadUsers(0, val, userRoleFilter);
                      }}
                    >
                      <option value="">{t('admin.filterAll')}</option>
                      <option value="ACTIVE">{t('admin.statusActive')}</option>
                      <option value="UNCONFIRMED">{t('admin.statusUnconfirmed')}</option>
                      <option value="SUSPENDED">{t('admin.statusSuspended')}</option>
                    </select>
                  </div>

                  <div className="admin-filter-group">
                    <label>{t('admin.filterRoleLabel')}:</label>
                    <select
                      value={userRoleFilter}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUserRoleFilter(val);
                        loadUsers(0, userStatusFilter, val);
                      }}
                    >
                      <option value="">{t('admin.filterRoleAll')}</option>
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    className="admin-refresh-btn"
                    onClick={() => loadUsers(page, userStatusFilter, userRoleFilter)}
                    disabled={loadingUsers}
                    title={t('common.refresh')}
                  >
                    <RefreshCw size={14} className={loadingUsers ? 'rotating' : ''} />
                    <span>{loadingUsers ? t('common.loading') : t('common.refresh')}</span>
                  </button>
                </div>
              </div>

              {/* Feedback Alert */}
              {userFeedback && (
                <div className={`admin-feedback-banner ${userFeedback.ok ? 'success' : 'error'}`}>
                  {userFeedback.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{userFeedback.msg}</span>
                </div>
              )}

              {/* Table / Empty */}
              {loadingUsers && users.length === 0 ? (
                <div className="admin-loading-state">
                  <Loader2 size={32} className="rotating" color="#059669" />
                  <span>{t('admin.loadingUsers')}</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="admin-empty-state">
                  <Users size={48} color="#64748b" />
                  <h4>{t('admin.noUsersFound')}</h4>
                </div>
              ) : (
                <div className="admin-table-card">
                  <div className="admin-users-table-wrap">
                    <table className="admin-users-table">
                      <thead>
                        <tr>
                          <th>{t('admin.userNameCol')}</th>
                          <th>{t('admin.userEmailCol')}</th>
                          <th>{t('admin.userRoleCol')}</th>
                          <th>{t('admin.userStatusCol')}</th>
                          <th>{t('admin.changeStatusLabel')}</th>
                          <th>{t('admin.userActionsCol')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => {
                          const isActioningThisUser =
                            updatingUserId === u.id || approvingUserId === u.id;
                          const initials = (u.name || u.email)
                            .split(' ')
                            .filter(Boolean)
                            .map((p) => p[0].toUpperCase())
                            .slice(0, 2)
                            .join('') || 'U';

                          return (
                            <tr key={u.id} className={isActioningThisUser ? 'row-updating' : ''}>
                              {/* Name & Avatar */}
                              <td>
                                <div className="admin-user-cell">
                                  <div
                                    className={`admin-avatar-small ${u.role === 'ADMIN' ? 'avatar-admin' : 'avatar-user'
                                      }`}
                                  >
                                    {initials}
                                  </div>
                                  <div>
                                    <strong>{u.name || t('userMenu.unnamedUser')}</strong>
                                    {u.createdAt && (
                                      <span className="admin-user-date">
                                        {new Date(u.createdAt).toLocaleDateString(undefined, {
                                          dateStyle: 'short',
                                        })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Email */}
                              <td className="user-email-cell">{u.email}</td>

                              {/* Role */}
                              <td>
                                <span className={`admin-badge-role ${u.role?.toLowerCase()}`}>
                                  {u.role === 'ADMIN' ? <ShieldCheck size={11} /> : null}
                                  <span>{u.role}</span>
                                </span>
                              </td>

                              {/* Current Status */}
                              <td>
                                <span className={`admin-badge-status ${u.status?.toLowerCase()}`}>
                                  {u.status === 'ACTIVE' && <CheckCircle2 size={11} />}
                                  {u.status === 'UNCONFIRMED' && <Clock size={11} />}
                                  {u.status === 'SUSPENDED' && <Ban size={11} />}
                                  <span>{u.status}</span>
                                </span>
                              </td>

                              {/* Change Status Dropdown */}
                              <td>
                                <div className="admin-status-select-wrap">
                                  <select
                                    className="admin-status-select"
                                    value={u.status}
                                    disabled={isActioningThisUser}
                                    onChange={(e) =>
                                      handleSetUserStatus(
                                        u,
                                        e.target.value as 'ACTIVE' | 'UNCONFIRMED' | 'SUSPENDED'
                                      )
                                    }
                                    title={t('admin.changeStatusPrompt')}
                                  >
                                    <option value="ACTIVE">{t('admin.statusActive')}</option>
                                    <option value="UNCONFIRMED">{t('admin.statusUnconfirmed')}</option>
                                    <option value="SUSPENDED">{t('admin.statusSuspended')}</option>
                                  </select>
                                  {isActioningThisUser && (
                                    <Loader2 size={13} className="rotating select-spinner" />
                                  )}
                                </div>
                              </td>

                              {/* Quick Actions */}
                              <td>
                                <div className="admin-user-actions-cell">
                                  {u.status === 'UNCONFIRMED' && (
                                    <button
                                      type="button"
                                      className="admin-approve-user-btn"
                                      disabled={isActioningThisUser}
                                      onClick={() => handleApproveUser(u)}
                                      title={t('admin.approveUserBtn')}
                                    >
                                      {approvingUserId === u.id ? (
                                        <Loader2 size={12} className="rotating" />
                                      ) : (
                                        <UserCheck size={12} />
                                      )}
                                      <span>{t('admin.approveUserBtn')}</span>
                                    </button>
                                  )}

                                  {u.status === 'ACTIVE' && (
                                    <button
                                      type="button"
                                      className="admin-suspend-user-btn"
                                      disabled={isActioningThisUser}
                                      onClick={() => handleSetUserStatus(u, 'SUSPENDED')}
                                      title={t('admin.suspendUserBtn')}
                                    >
                                      {updatingUserId === u.id ? (
                                        <Loader2 size={12} className="rotating" />
                                      ) : (
                                        <Ban size={12} />
                                      )}
                                      <span>{t('admin.suspendUserBtn')}</span>
                                    </button>
                                  )}

                                  {u.status === 'SUSPENDED' && (
                                    <button
                                      type="button"
                                      className="admin-reactivate-user-btn"
                                      disabled={isActioningThisUser}
                                      onClick={() => handleSetUserStatus(u, 'ACTIVE')}
                                      title={t('admin.reactivateUserBtn')}
                                    >
                                      {updatingUserId === u.id ? (
                                        <Loader2 size={12} className="rotating" />
                                      ) : (
                                        <RotateCcw size={12} />
                                      )}
                                      <span>{t('admin.reactivateUserBtn')}</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="admin-pagination-bar">
                    <span className="admin-pagination-info">
                      {totalElements === 1
                        ? t('admin.userCountSingle')
                        : t('admin.userCountPlural', { count: totalElements })}
                    </span>

                    {totalPages > 1 && (
                      <div className="admin-pagination-actions">
                        <button
                          type="button"
                          className="admin-page-btn"
                          disabled={page === 0 || loadingUsers}
                          onClick={() => loadUsers(page - 1, userStatusFilter, userRoleFilter)}
                        >
                          <ChevronLeft size={14} />
                          <span>{t('admin.prevPage')}</span>
                        </button>

                        <span className="admin-page-indicator">
                          {t('admin.pageIndicator', { current: page + 1, total: totalPages })}
                        </span>

                        <button
                          type="button"
                          className="admin-page-btn"
                          disabled={page + 1 >= totalPages || loadingUsers}
                          onClick={() => loadUsers(page + 1, userStatusFilter, userRoleFilter)}
                        >
                          <span>{t('admin.nextPage')}</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* SECTION: PROPOSALS */}
          {/* =============================================================== */}
          {activeTab === 'proposals' && (
            <div className="admin-view-container">
              <div className="admin-view-header">
                <div>
                  <h2 className="admin-view-title">{t('admin.tabProposals')}</h2>
                  <p className="admin-view-desc">{t('admin.proposalsSubtitle')}</p>
                </div>
              </div>

              <div className="admin-tab-toolbar">
                <span className="admin-toolbar-info">
                  {proposals.length === 1
                    ? t('admin.pendingProposalsCountSingle')
                    : t('admin.pendingProposalsCountPlural', { count: proposals.length })}
                </span>
                <button
                  type="button"
                  className="admin-refresh-btn"
                  onClick={loadProposals}
                  disabled={loadingProposals}
                  title={t('common.refresh')}
                >
                  <RefreshCw size={14} className={loadingProposals ? 'rotating' : ''} />
                  <span>{loadingProposals ? t('common.loading') : t('common.refresh')}</span>
                </button>
              </div>

              {proposalFeedback && (
                <div className={`admin-feedback-banner ${proposalFeedback.ok ? 'success' : 'error'}`}>
                  {proposalFeedback.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{proposalFeedback.msg}</span>
                </div>
              )}

              {loadingProposals && proposals.length === 0 ? (
                <div className="admin-loading-state">
                  <Loader2 size={32} className="rotating" color="#059669" />
                  <span>{t('admin.loadingProposals')}</span>
                </div>
              ) : proposals.length === 0 ? (
                <div className="admin-empty-state">
                  <CheckCircle2 size={48} color="#059669" />
                  <h4>{t('admin.noPendingProposalsTitle')}</h4>
                  <p>{t('admin.noPendingProposalsDesc')}</p>
                </div>
              ) : (
                <div className="admin-proposals-grid">
                  {proposals.map((tree) => (
                    <div key={tree.id} className="admin-proposal-card">
                      <div className="admin-proposal-header">
                        <div>
                          <span className="admin-proposal-id">ID #{tree.id}</span>
                          <h4 className="admin-proposal-species">{tree.species}</h4>
                        </div>
                        <span className="admin-status-badge pending">
                          {t('admin.statusPending')}
                        </span>
                      </div>

                      <div className="admin-proposal-details">
                        <div className="admin-proposal-meta">
                          <MapPin size={14} />
                          <span>
                            {tree.locationDescription ||
                              `${tree.latitude.toFixed(5)}, ${tree.longitude.toFixed(5)}`}
                          </span>
                        </div>
                        <div className="admin-proposal-meta">
                          <Calendar size={14} />
                          <span>
                            {new Date(tree.createdAt).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                        {tree.height && (
                          <div className="admin-proposal-meta">
                            <Ruler size={14} />
                            <span>{tree.height} m</span>
                          </div>
                        )}
                        <div className="admin-proposal-meta">
                          <HeartPulse size={14} />
                          <span>{t('healthLevels.short_' + tree.healthLevel)}</span>
                        </div>
                        <div className="admin-proposal-meta">
                          <Droplets size={14} />
                          <span>{t('wateringLevels.short_' + tree.wateringLevel)}</span>
                        </div>
                      </div>

                      {tree.notes && (
                        <div className="admin-proposal-notes">
                          <strong>{t('admin.notesLabel')}:</strong> {tree.notes}
                        </div>
                      )}

                      {rejectPromptId === tree.id ? (
                        <div className="admin-reject-prompt">
                          <input
                            type="text"
                            placeholder={t('admin.rejectReasonPlaceholder')}
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            autoFocus
                          />
                          <div className="admin-prompt-actions">
                            <button
                              type="button"
                              className="admin-cancel-small-btn"
                              onClick={() => {
                                setRejectPromptId(null);
                                setRejectReason('');
                              }}
                            >
                              {t('common.cancel')}
                            </button>
                            <button
                              type="button"
                              className="admin-confirm-reject-btn"
                              disabled={actioningId === tree.id}
                              onClick={() => handleReject(tree)}
                            >
                              {actioningId === tree.id ? (
                                <Loader2 size={14} className="rotating" />
                              ) : (
                                <XCircle size={14} />
                              )}
                              <span>{t('admin.confirmRejectBtn')}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="admin-proposal-actions">
                          <button
                            type="button"
                            className="admin-reject-btn"
                            disabled={actioningId === tree.id}
                            onClick={() => setRejectPromptId(tree.id)}
                          >
                            <XCircle size={15} />
                            <span>{t('admin.rejectBtn')}</span>
                          </button>
                          <button
                            type="button"
                            className="admin-approve-btn"
                            disabled={actioningId === tree.id}
                            onClick={() => handleApprove(tree)}
                          >
                            {actioningId === tree.id ? (
                              <Loader2 size={15} className="rotating" />
                            ) : (
                              <CheckCircle2 size={15} />
                            )}
                            <span>{t('admin.approveBtn')}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* SECTION: SPECIES */}
          {/* =============================================================== */}
          {activeTab === 'species' && (
            <div className="admin-view-container">
              <div className="admin-view-header">
                <div>
                  <h2 className="admin-view-title">{t('admin.tabSpecies')}</h2>
                  <p className="admin-view-desc">{t('admin.speciesSubtitle')}</p>
                </div>
              </div>

              {/* Species Toolbar */}
              <div className="admin-tab-toolbar admin-species-toolbar">
                <div className="admin-species-toolbar-left">
                  <div className="admin-search-box">
                    <Search size={14} />
                    <input
                      type="text"
                      placeholder={t('admin.searchSpeciesPlaceholder')}
                      value={searchSpeciesQuery}
                      onChange={(e) => setSearchSpeciesQuery(e.target.value)}
                    />
                    {searchSpeciesQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchSpeciesQuery('')}
                        className="admin-search-clear"
                        title={t('common.close')}
                      >
                        <XCircle size={12} />
                      </button>
                    )}
                  </div>

                  <span className="admin-toolbar-info">
                    {searchSpeciesQuery
                      ? t('admin.speciesCatalogCountFiltered', {
                        filtered: filteredSpecies.length,
                        total: speciesList.length,
                      })
                      : t('admin.speciesCatalogCount', { count: speciesList.length })}
                  </span>
                </div>

                <div className="admin-species-toolbar-right">
                  <button
                    type="button"
                    className="admin-species-toggle-btn"
                    onClick={() => setShowAddSpeciesForm((prev) => !prev)}
                  >
                    {showAddSpeciesForm ? <ChevronUp size={15} /> : <Plus size={15} />}
                    <span>
                      {showAddSpeciesForm
                        ? t('admin.hideAddSpeciesForm')
                        : t('admin.showAddSpeciesForm')}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="admin-refresh-btn"
                    onClick={() => loadSpecies(true)}
                    disabled={loadingSpeciesList}
                    title={t('common.refresh')}
                  >
                    <RefreshCw size={14} className={loadingSpeciesList ? 'rotating' : ''} />
                    <span>{loadingSpeciesList ? t('common.loading') : t('common.refresh')}</span>
                  </button>
                </div>
              </div>

              {/* Feedback banner */}
              {speciesFeedback && (
                <div className={`admin-feedback-banner ${speciesFeedback.ok ? 'success' : 'error'}`}>
                  {speciesFeedback.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{speciesFeedback.msg}</span>
                </div>
              )}

              {/* Collapsible New Species Form */}
              {showAddSpeciesForm && (
                <div className="admin-species-form-card">
                  <div className="admin-section-header">
                    <Plus size={20} color="#059669" />
                    <div>
                      <h4>{t('admin.addSpeciesTitle')}</h4>
                      <p className="admin-section-desc">{t('admin.addSpeciesDesc')}</p>
                    </div>
                  </div>

                  <form onSubmit={handleCreateSpecies} className="admin-form">
                    <div className="form-group">
                      <label>{t('admin.scientificNameLabel')} *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Quercus robur, Betula pendula, Tilia tomentosa"
                        value={speciesScientific}
                        onChange={(e) => setSpeciesScientific(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>{t('admin.commonNameLabel')} *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Stejar pedunculat, Mesteacăn alb, Tei argintiu"
                        value={speciesCommon}
                        onChange={(e) => setSpeciesCommon(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>{t('admin.aliasesLabel')}</label>
                      <input
                        type="text"
                        placeholder="Ex: English oak, Stejar de luncă"
                        value={speciesAliases}
                        onChange={(e) => setSpeciesAliases(e.target.value)}
                      />
                      <small className="form-hint">{t('admin.aliasesHelp')}</small>
                    </div>

                    {speciesScientific.trim() && speciesCommon.trim() && (
                      <div className="admin-species-preview">
                        <span>{t('admin.previewFormat')}:</span>
                        <strong>{`${speciesScientific.trim()} (${speciesCommon.trim()})`}</strong>
                      </div>
                    )}

                    <button type="submit" className="admin-submit-btn" disabled={speciesLoading}>
                      {speciesLoading ? (
                        <>
                          <Loader2 size={16} className="rotating" />
                          <span>{t('common.submitting')}</span>
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          <span>{t('admin.addSpeciesBtn')}</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Species Catalog Table */}
              <div className="admin-table-card">
                {loadingSpeciesList && speciesList.length === 0 ? (
                  <div className="admin-loading-state">
                    <Loader2 size={32} className="rotating" color="#059669" />
                    <span>{t('admin.loadingSpecies')}</span>
                  </div>
                ) : speciesList.length === 0 ? (
                  <div className="admin-empty-state">
                    <TreePine size={44} color="#059669" />
                    <h4>{t('admin.speciesListTitle')}</h4>
                    <p>{t('admin.emptyCatalogNotice')}</p>
                    {!showAddSpeciesForm && (
                      <button
                        type="button"
                        className="admin-species-toggle-btn"
                        style={{ marginTop: 12 }}
                        onClick={() => setShowAddSpeciesForm(true)}
                      >
                        <Plus size={15} />
                        <span>{t('admin.showAddSpeciesForm')}</span>
                      </button>
                    )}
                  </div>
                ) : filteredSpecies.length === 0 ? (
                  <div className="admin-empty-state">
                    <Search size={36} color="#64748b" />
                    <p>{t('admin.noSpeciesFound')}</p>
                  </div>
                ) : (
                  <div className="admin-users-table-wrap">
                    <table className="admin-users-table admin-species-table">
                      <thead>
                        <tr>
                          <th style={{ width: 60 }}>{t('admin.speciesColId')}</th>
                          <th>{t('admin.speciesColCommon')}</th>
                          <th>{t('admin.speciesColScientific')}</th>
                          <th>{t('admin.speciesColFullName')}</th>
                          <th>{t('admin.speciesColAliases')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSpecies.map((sp) => (
                          <tr key={sp.id || sp.name}>
                            <td className="species-id-cell">
                              <span className="species-id-badge">#{sp.id}</span>
                            </td>
                            <td className="species-common-cell">
                              <div className="species-common-wrap">
                                <TreePine size={15} className="species-icon" />
                                <strong>{sp.commonName || sp.name}</strong>
                              </div>
                            </td>
                            <td className="species-scientific-cell">
                              <span className="species-scientific-text">
                                {sp.scientificName || '—'}
                              </span>
                            </td>
                            <td className="species-fullname-cell">
                              <span className="species-format-tag">{sp.name}</span>
                            </td>
                            <td className="species-aliases-cell">
                              {sp.aliases ? (
                                <div className="species-aliases-list">
                                  {sp.aliases.split(',').map((alias, idx) => (
                                    <span key={idx} className="species-alias-tag">
                                      {alias.trim()}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="species-no-alias">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* SECTION: EMAILS */}
          {/* =============================================================== */}
          {activeTab === 'emails' && (
            <div className="admin-view-container">
              <div className="admin-view-header">
                <div>
                  <h2 className="admin-view-title">{t('admin.tabEmails')}</h2>
                  <p className="admin-view-desc">{t('admin.emailsSubtitle')}</p>
                </div>
              </div>

              {templateFeedback && (
                <div className={`admin-feedback-banner ${templateFeedback.ok ? 'success' : 'error'}`}>
                  {templateFeedback.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{templateFeedback.msg}</span>
                </div>
              )}

              <div className="admin-emails-layout">
                {/* Template list sidebar */}
                <div className="admin-emails-sidebar">
                  <div className="admin-sidebar-header-row">
                    <span className="admin-sidebar-header">{t('admin.emailTemplatesList')}</span>
                    {templates.length > 0 && (
                      <span className="admin-tab-counter">{templates.length}</span>
                    )}
                  </div>
                  {loadingTemplates ? (
                    <div className="admin-loading-small">
                      <Loader2 size={16} className="rotating" />
                    </div>
                  ) : (
                    templates.map((tpl) => (
                      <button
                        key={tpl.id || tpl.name}
                        type="button"
                        className={`admin-email-tab-item ${selectedTemplate?.id === tpl.id ? 'active' : ''
                          }`}
                        onClick={() => handleSelectTemplate(tpl)}
                        title={tpl.name}
                      >
                        <div className="admin-email-tab-icon">
                          <Mail size={15} />
                        </div>
                        <div className="admin-email-tab-info">
                          <strong>{tpl.name}</strong>
                          <span>{tpl.subject}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Template Editor */}
                <div className="admin-email-editor">
                  {selectedTemplate ? (
                    <form onSubmit={handleSaveTemplate} className="admin-form">
                      <div className="admin-editor-header">
                        <div>
                          <div className="admin-template-badge-row">
                            <h4 className="admin-editor-title">{selectedTemplate.name}</h4>
                            <span className="admin-template-type-badge">Template</span>
                          </div>
                          {selectedTemplate.description && (
                            <p className="admin-section-desc">{selectedTemplate.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="form-group">
                        <label>{t('admin.templateSubjectLabel')}</label>
                        <input
                          ref={subjectInputRef}
                          type="text"
                          required
                          value={templateSubject}
                          onChange={(e) => setTemplateSubject(e.target.value)}
                          onFocus={() => setLastFocusedField('subject')}
                        />
                      </div>

                      <div className="form-group">
                        <label>{t('admin.templateBodyLabel')}</label>
                        <textarea
                          ref={bodyTextareaRef}
                          rows={10}
                          required
                          className="admin-template-textarea"
                          value={templateBody}
                          onChange={(e) => setTemplateBody(e.target.value)}
                          onFocus={() => setLastFocusedField('body')}
                        />
                      </div>

                      {selectedTemplate.availablePlaceholders &&
                        selectedTemplate.availablePlaceholders.length > 0 && (
                          <div className="admin-placeholders-row">
                            <span className="admin-placeholders-label">
                              {t('admin.placeholdersLabel')}:
                            </span>
                            <div className="admin-placeholders-pills">
                              {selectedTemplate.availablePlaceholders.map((ph, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  className="admin-placeholder-pill"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => handleInsertPlaceholder(ph)}
                                  title={t('admin.insertPlaceholderTooltip', { ph })}
                                >
                                  <code>{ph}</code>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                      <button
                        type="submit"
                        className="admin-submit-btn"
                        disabled={savingTemplate}
                      >
                        {savingTemplate ? (
                          <>
                            <Loader2 size={15} className="rotating" />
                            <span>{t('common.submitting')}</span>
                          </>
                        ) : (
                          <>
                            <Save size={15} />
                            <span>{t('admin.saveTemplateBtn')}</span>
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <div className="admin-empty-state">
                      <Edit2 size={32} color="#64748b" />
                      <p>{t('admin.selectTemplateToEdit')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminPage;
