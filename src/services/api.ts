import type { BoundingBox, TreeCheckinRequest, TreeCheckinResponse, TreeCreateRequest, TreeResponse } from '../types/tree';
import { MOCK_TIMISOARA_TREES } from '../data/mockTrees';
import { getDistanceMeters } from '../utils/geo';
import { getAppConfig } from './config';

export interface ApiStatus {
  connected: boolean;
  source: 'backend_live' | 'demo_curated';
  message: string;
  host?: string;
  treeCount?: number;
}

// In-memory store for trees in Demo mode
let sessionTrees: TreeResponse[] = [...MOCK_TIMISOARA_TREES];

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

  // 1. DEMO MODE
  if (config.mode === 'demo') {
    const filtered = sessionTrees.filter(
      (t) =>
        t.latitude >= bounds.minLat &&
        t.latitude <= bounds.maxLat &&
        t.longitude >= bounds.minLng &&
        t.longitude <= bounds.maxLng
    );
    return {
      trees: filtered,
      status: {
        connected: true,
        source: 'demo_curated',
        message: 'Mod Demo Activ (Arbori Timișoara)',
        treeCount: filtered.length,
      },
    };
  }

  // 2. LIVE BACKEND MODE
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
          source: 'backend_live',
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
          source: 'backend_live',
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
        source: 'backend_live',
        host,
        message: `Deconectat de la ${host} (${msg})`,
      },
    };
  }
}

export async function fetchTreeById(id: number): Promise<TreeResponse | undefined> {
  const config = getAppConfig();
  if (config.mode === 'live') {
    try {
      const res = await fetch(`${config.backendHost}/api/trees/${id}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return undefined;
  }
  return sessionTrees.find((t) => t.id === id);
}

export async function submitTreeCheckin(
  treeId: number,
  data: TreeCheckinRequest
): Promise<TreeCheckinResponse> {
  const config = getAppConfig();
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (config.mode === 'live') {
    const res = await fetch(`${config.backendHost}/api/trees/${treeId}/check-ins`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error(`Eroare backend HTTP ${res.status}`);
    }
    return await res.json();
  }

  // Demo simulation
  const targetTree = sessionTrees.find((t) => t.id === treeId);
  const treeLat = targetTree ? targetTree.latitude : data.latitude;
  const treeLng = targetTree ? targetTree.longitude : data.longitude;
  const deviation = getDistanceMeters(data.latitude, data.longitude, treeLat, treeLng);
  const isValid = deviation <= 2.5;

  const updatedTree: TreeResponse = targetTree
    ? {
        ...targetTree,
        healthLevel: data.healthLevel || targetTree.healthLevel,
        wateringLevel: data.wateringLevel || targetTree.wateringLevel,
        lastWateredAt: data.watered ? new Date().toISOString() : targetTree.lastWateredAt,
        species: data.proposedSpecies || targetTree.species,
        height: data.height || targetTree.height,
        notes: data.notes ? `${targetTree.notes || ''} | ${data.notes}` : targetTree.notes,
        updatedAt: new Date().toISOString(),
      }
    : ({} as TreeResponse);

  sessionTrees = sessionTrees.map((t) => (t.id === treeId ? updatedTree : t));

  return {
    id: `demo-${Date.now()}`,
    treeId,
    latitude: data.latitude,
    longitude: data.longitude,
    deviationMeters: deviation,
    valid: isValid,
    wateringLevel: data.wateringLevel,
    watered: data.watered,
    healthLevel: data.healthLevel,
    notes: data.notes,
    createdAt: new Date().toISOString(),
    tree: updatedTree,
  };
}

export async function proposeNewTree(data: TreeCreateRequest): Promise<TreeResponse> {
  const config = getAppConfig();
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (config.mode === 'live') {
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

  // Demo mode
  const newTree: TreeResponse = {
    id: Date.now(),
    latitude: data.latitude,
    longitude: data.longitude,
    species: data.species,
    healthLevel: data.healthLevel,
    wateringLevel: data.wateringLevel || 'MODERATE',
    lastWateredAt: data.lastWateredAt || new Date().toISOString(),
    height: data.height || 5.0,
    age: data.age || 5,
    trunkCircumference: data.trunkCircumference || 45,
    locationDescription: data.locationDescription || 'Arbore adăugat recent',
    notes: data.notes || '',
    status: 'PENDING_APPROVAL',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  sessionTrees = [newTree, ...sessionTrees];
  return newTree;
}

export { fetchAvailableSpecies, clearSpeciesCache, getSpeciesCacheStatus } from './species';

