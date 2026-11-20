import type { BoundingBox, TreeCheckinRequest, TreeCheckinResponse, TreeCreateRequest, TreeResponse } from '../types/tree';
import { getAppConfig } from './config';
import { getStoredUser, getStoredToken } from './auth';
import { getUserTreeCheckinCooldown, recordUserTreeCheckin } from './checkinLimit';

export interface ApiStatus {
  connected: boolean;
  message: string;
  host?: string;
  treeCount?: number;
}

export async function testBackendHost(
  host: string
): Promise<{ ok: boolean; message: string; treeCount?: number }> {
  const cleanHost = host.trim().replace(/\/+$/, '');
  try {
    const res = await fetch(`${cleanHost}/api/trees`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      const count = Array.isArray(data) ? data.length : 0;
      return {
        ok: true,
        message: `Conexiune reușită! Baza de date conține ${count} arbori.`,
        treeCount: count,
      };
    } else {
      return {
        ok: false,
        message: `Serverul a răspuns cu codul HTTP ${res.status} (${res.statusText})`,
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      message: `Nu s-a putut contacta serverul: ${msg}`,
    };
  }
}

export async function fetchTreesInArea(
  bounds: BoundingBox
): Promise<{ trees: TreeResponse[]; status: ApiStatus }> {
  const config = getAppConfig();
  const host = config.backendHost;
  try {
    const url = `${host}/api/trees/area?minLat=${bounds.minLat}&maxLat=${bounds.maxLat}&minLng=${bounds.minLng}&maxLng=${bounds.maxLng}`;
    const res = await fetch(url, { credentials: 'omit' });

    if (res.ok) {
      const data: TreeResponse[] = await res.json();
      const treesArray = Array.isArray(data) ? data : [];
      return {
        trees: treesArray,
        status: {
          connected: true,
          host,
          treeCount: treesArray.length,
          message:
            treesArray.length > 0
              ? `Live: ${host} (${treesArray.length} arbori)`
              : `Live: ${host} (0 arbori în aria vizibilă)`,
        },
      };
    } else {
      return {
        trees: [],
        status: {
          connected: false,
          host,
          message: `Eroare server backend HTTP ${res.status}`,
        },
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Eroare necunoscută';
    return {
      trees: [],
      status: {
        connected: false,
        host,
        message: `Deconectat de la ${host} (${msg})`,
      },
    };
  }
}

export async function fetchTreeById(id: number): Promise<TreeResponse | undefined> {
  const config = getAppConfig();
  try {
    const res = await fetch(`${config.backendHost}/api/trees/${id}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Return undefined on network failure
  }
  return undefined;
}

export async function fetchTreeCheckins(treeId: number): Promise<TreeCheckinResponse[]> {
  const config = getAppConfig();
  try {
    const res = await fetch(`${config.backendHost}/api/trees/${treeId}/check-ins`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Return empty array on failure
  }
  return [];
}

export async function submitTreeCheckin(
  treeId: number,
  data: TreeCheckinRequest
): Promise<TreeCheckinResponse> {
  const config = getAppConfig();
  const token = getStoredToken();
  const currentUser = getStoredUser();
  const userId = currentUser?.id || currentUser?.email;

  // Enforce 24-hour rate limit per tree per user
  if (userId) {
    const cooldown = getUserTreeCheckinCooldown(userId, treeId);
    if (!cooldown.canCheckin) {
      throw new Error(
        `Ai înregistrat deja un check-in la acest arbore în ultimele 24 de ore. Revino peste ${cooldown.remainingFormatted}.`
      );
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${config.backendHost}/api/trees/${treeId}/check-ins`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(`Eroare backend HTTP ${res.status}`);
  }
  const result: TreeCheckinResponse = await res.json();
  if (userId) {
    recordUserTreeCheckin(userId, treeId);
  }
  return result;
}

export async function proposeNewTree(data: TreeCreateRequest): Promise<TreeResponse> {
  const config = getAppConfig();
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${config.backendHost}/api/trees/propose`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Eroare salvare arbore pe backend: ${res.status}`);
  }
  return await res.json();
}

export { fetchAvailableSpecies, clearSpeciesCache, getSpeciesCacheStatus } from './species';
