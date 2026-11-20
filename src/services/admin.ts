import { getAppConfig } from './config';
import { getStoredToken } from './auth';
import type { TreeResponse, TreeCreateRequest, SpeciesResponse } from '../types/tree';
import type { User } from '../types/auth';
import type {
  TreeRejectRequest,
  TreeSpeciesCreateRequest,
  UserPageResponse,
  EmailTemplateResponse,
  EmailTemplateUpdateRequest,
} from '../types/admin';
import { clearSpeciesCache } from './species';

function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * List pending tree proposals awaiting admin approval
 * GET /api/admin/trees/proposals
 */
export async function fetchPendingTreeProposals(): Promise<TreeResponse[]> {
  const config = getAppConfig();
  const res = await fetch(`${config.backendHost}/api/admin/trees/proposals`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Nu s-au putut încărca propunerile de arbori (HTTP ${res.status})`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Approve a tree proposal
 * POST /api/admin/trees/{id}/approve
 */
export async function approveTreeProposal(id: number): Promise<TreeResponse> {
  const config = getAppConfig();
  const res = await fetch(`${config.backendHost}/api/admin/trees/${id}/approve`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Eroare la aprobarea arborelui (HTTP ${res.status})`);
  }
  return await res.json();
}

/**
 * Reject a tree proposal with a reason
 * POST /api/admin/trees/{id}/reject
 */
export async function rejectTreeProposal(id: number, reason: string): Promise<TreeResponse> {
  const config = getAppConfig();
  const body: TreeRejectRequest = { reason };
  const res = await fetch(`${config.backendHost}/api/admin/trees/${id}/reject`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Eroare la respingerea arborelui (HTTP ${res.status})`);
  }
  return await res.json();
}

/**
 * Directly register a tree as admin
 * POST /api/admin/trees
 */
export async function createTreeAsAdmin(data: TreeCreateRequest): Promise<TreeResponse> {
  const config = getAppConfig();
  const res = await fetch(`${config.backendHost}/api/admin/trees`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Eroare la adăugarea arborelui (HTTP ${res.status})`);
  }
  return await res.json();
}

/**
 * Add a new botanical species as admin
 * POST /api/admin/species
 */
export async function createSpeciesAsAdmin(data: TreeSpeciesCreateRequest): Promise<SpeciesResponse> {
  const config = getAppConfig();
  const res = await fetch(`${config.backendHost}/api/admin/species`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    let msg = `Eroare la adăugarea speciei (HTTP ${res.status})`;
    try {
      const err = await res.json();
      msg = err.message || msg;
    } catch {
      // fallback
    }
    throw new Error(msg);
  }
  const result: SpeciesResponse = await res.json();
  clearSpeciesCache();
  return result;
}

/**
 * Get all users paged (Admin only)
 * GET /api/admin/users
 */
export async function fetchAdminUsers(params?: {
  page?: number;
  size?: number;
  status?: string;
  role?: string;
}): Promise<UserPageResponse> {
  const config = getAppConfig();
  const query = new URLSearchParams();
  if (params?.page !== undefined) query.set('page', String(params.page));
  if (params?.size !== undefined) query.set('size', String(params.size));
  if (params?.status) query.set('status', params.status);
  if (params?.role) query.set('role', params.role);

  const qs = query.toString();
  const url = `${config.backendHost}/api/admin/users${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Nu s-a putut încărca lista de utilizatori (HTTP ${res.status})`);
  }
  return await res.json();
}

/**
 * Approve user account (Admin only)
 * PUT /api/admin/users/{id}/approve
 */
export async function approveAdminUser(id: string): Promise<User> {
  const config = getAppConfig();
  const res = await fetch(`${config.backendHost}/api/admin/users/${id}/approve`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    let errorMsg = `Eroare la aprobarea contului utilizator (HTTP ${res.status})`;
    try {
      const err = await res.json();
      if (err.message) errorMsg = err.message;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }
  return await res.json();
}

/**
 * Change or update user account status (Admin only)
 * Supports UNCONFIRMED, ACTIVE, SUSPENDED
 * PUT /api/admin/users/{id}/status?status=...
 */
export async function updateAdminUserStatus(
  id: string,
  status: 'ACTIVE' | 'UNCONFIRMED' | 'SUSPENDED'
): Promise<User> {
  const config = getAppConfig();
  const url = `${config.backendHost}/api/admin/users/${id}/status?status=${encodeURIComponent(status)}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });

  if (res.ok) {
    return await res.json();
  }

  // Graceful fallback for approving an unconfirmed user if /status route is not available
  if (status === 'ACTIVE') {
    const approveRes = await fetch(`${config.backendHost}/api/admin/users/${id}/approve`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    if (approveRes.ok) {
      return await approveRes.json();
    }
  }

  let errorMsg = `Eroare la modificarea statusului utilizatorului (HTTP ${res.status})`;
  try {
    const err = await res.json();
    if (err.message) errorMsg = err.message;
  } catch {
    // fallback
  }
  throw new Error(errorMsg);
}

/**
 * Get all email templates (Admin only)
 * GET /api/admin/email-templates
 */
export async function fetchEmailTemplates(): Promise<EmailTemplateResponse[]> {
  const config = getAppConfig();
  const res = await fetch(`${config.backendHost}/api/admin/email-templates`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Nu s-au putut încărca șabloanele email (HTTP ${res.status})`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Get email template by ID or Name (Admin only)
 * GET /api/admin/email-templates/{idOrName}
 */
export async function fetchEmailTemplate(idOrName: string): Promise<EmailTemplateResponse> {
  const config = getAppConfig();
  const res = await fetch(`${config.backendHost}/api/admin/email-templates/${encodeURIComponent(idOrName)}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Nu s-a putut încărca șablonul (HTTP ${res.status})`);
  }
  return await res.json();
}

/**
 * Update an email template (Admin only)
 * PUT /api/admin/email-templates/{idOrName}
 */
export async function updateEmailTemplate(
  idOrName: string,
  data: EmailTemplateUpdateRequest
): Promise<EmailTemplateResponse> {
  const config = getAppConfig();
  const res = await fetch(`${config.backendHost}/api/admin/email-templates/${encodeURIComponent(idOrName)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Eroare la salvarea șablonului de email (HTTP ${res.status})`);
  }
  return await res.json();
}
