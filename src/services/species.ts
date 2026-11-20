import type { SpeciesResponse } from '../types/tree';
import { DEFAULT_BACKEND_HOST, getAppConfig } from './config';

const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes cache duration
const STORAGE_KEY = 'copaculmeu_species_cache';

interface CachedSpeciesPayload {
  timestamp: number;
  species: SpeciesResponse[];
}

// In-memory cache for ultra-fast same-session resolution without parsing JSON
let memoryCache: CachedSpeciesPayload | null = null;
let inflightPromise: Promise<SpeciesResponse[]> | null = null;

/**
 * Reads valid cached species from memory or localStorage if not older than 30 minutes.
 */
function getValidCachedSpecies(): SpeciesResponse[] | null {
  const now = Date.now();

  // 1. Check in-memory cache
  if (memoryCache && now - memoryCache.timestamp < CACHE_DURATION_MS) {
    return memoryCache.species;
  }

  // 2. Check localStorage cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: CachedSpeciesPayload = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed.timestamp === 'number' &&
        Array.isArray(parsed.species) &&
        parsed.species.length > 0 &&
        now - parsed.timestamp < CACHE_DURATION_MS
      ) {
        // Hydrate memory cache
        memoryCache = parsed;
        return parsed.species;
      }
    }
  } catch (err) {
    console.warn('[SpeciesCache] Failed reading from localStorage:', err);
  }

  return null;
}

/**
 * Saves fetched species to both in-memory cache and localStorage with current timestamp.
 */
function saveSpeciesToCache(species: SpeciesResponse[]): void {
  const payload: CachedSpeciesPayload = {
    timestamp: Date.now(),
    species,
  };

  memoryCache = payload;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('[SpeciesCache] Failed saving to localStorage:', err);
  }
}

/**
 * Fetches the available tree species from the backend server.
 * Guarantees that results are cached for at least 30 minutes, unless forceRefresh is true.
 */
export async function fetchAvailableSpecies(forceRefresh = false): Promise<SpeciesResponse[]> {
  // 1. Return immediately if fresh cache exists and forceRefresh is not requested
  if (!forceRefresh) {
    const cached = getValidCachedSpecies();
    if (cached) {
      return cached;
    }
  }

  // 2. If a request is already in-flight, return the existing promise
  if (inflightPromise && !forceRefresh) {
    return inflightPromise;
  }

  // 3. Initiate network fetch with de-duplication
  inflightPromise = (async () => {
    const config = getAppConfig();
    const host = config.backendHost || DEFAULT_BACKEND_HOST;
    const targetUrl = `${host.trim().replace(/\/+$/, '')}/api/species`;

    try {
      const res = await fetch(targetUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          saveSpeciesToCache(data);
          return data;
        }
      }
      throw new Error(`Server returned HTTP ${res.status}`);
    } catch (err) {
      console.warn(`[SpeciesService] Could not fetch species from ${targetUrl}:`, err);

      // Check if stale cache exists as emergency fallback
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: CachedSpeciesPayload = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.species) && parsed.species.length > 0) {
            console.info('[SpeciesService] Using stale cached species as fallback.');
            return parsed.species;
          }
        }
      } catch {
        // Ignore JSON error
      }

      return [];
    } finally {
      inflightPromise = null;
    }
  })();

  return inflightPromise;
}

/**
 * Clears the species cache (useful for testing or manual synchronization).
 */
export function clearSpeciesCache(): void {
  memoryCache = null;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Returns current cache status for diagnostics or settings modal.
 */
export function getSpeciesCacheStatus(): {
  cached: boolean;
  ageMinutes: number;
  count: number;
} {
  const cached = getValidCachedSpecies();
  if (!cached || !memoryCache) {
    return { cached: false, ageMinutes: 0, count: 0 };
  }

  const ageMinutes = Math.floor((Date.now() - memoryCache.timestamp) / 60000);
  return {
    cached: true,
    ageMinutes,
    count: cached.length,
  };
}
