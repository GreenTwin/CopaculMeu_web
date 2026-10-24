/**
 * Service for enforcing the 24-hour check-in limit per tree per user.
 * 
 * Business rule:
 * - A user can check in on multiple distinct trees in the same day.
 * - However, the same tree can only be checked in once every 24 hours by the same user.
 */

const CHECKIN_STORAGE_KEY = 'copaculmeu_user_tree_checkins';
export const COOLDOWN_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export interface CheckinCooldownStatus {
  canCheckin: boolean;
  lastCheckinTimestamp: number | null;
  nextAllowedTimestamp: number | null;
  remainingMs: number;
  remainingFormatted: string;
}

/**
 * Composite key representing a specific user's check-in on a specific tree
 */
function getRecordKey(userId: string, treeId: number): string {
  return `${userId}:${treeId}`;
}

/**
 * Retrieve all check-in timestamps from localStorage
 */
function getAllRecords(): Record<string, number> {
  try {
    const raw = localStorage.getItem(CHECKIN_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Format remaining milliseconds into human-friendly duration in Romanian or English
 * e.g., "23 ore și 45 min" / "23 hours and 45 min"
 */
export function formatCooldownTime(remainingMs: number, lang: 'ro' | 'en' = 'ro'): string {
  if (remainingMs <= 0) return lang === 'en' ? 'now' : 'acum';
  const totalMinutes = Math.ceil(remainingMs / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (lang === 'en') {
    if (hours > 0 && minutes > 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} and ${minutes} min`;
    }
    if (hours > 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }
    if (minutes > 0) {
      return `${minutes} min`;
    }
    return 'under 1 minute';
  }

  if (hours > 0 && minutes > 0) {
    return `${hours} ${hours === 1 ? 'oră' : 'ore'} și ${minutes} min`;
  }
  if (hours > 0) {
    return `${hours} ${hours === 1 ? 'oră' : 'ore'}`;
  }
  if (minutes > 0) {
    return `${minutes} min`;
  }
  return 'sub 1 minut';
}

/**
 * Record a successful check-in for a given user and tree
 */
export function recordUserTreeCheckin(
  userId: string | undefined | null,
  treeId: number,
  timestamp = Date.now()
): void {
  if (!userId) return;
  try {
    const records = getAllRecords();
    records[getRecordKey(userId, treeId)] = timestamp;
    localStorage.setItem(CHECKIN_STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn('Could not persist check-in record to localStorage:', err);
  }
}

/**
 * Check whether a user is permitted to check in on a specific tree
 * Returns cooldown details if within 24h window
 */
export function getUserTreeCheckinCooldown(
  userId: string | undefined | null,
  treeId: number,
  lang: 'ro' | 'en' = 'ro'
): CheckinCooldownStatus {
  if (!userId) {
    return {
      canCheckin: false,
      lastCheckinTimestamp: null,
      nextAllowedTimestamp: null,
      remainingMs: 0,
      remainingFormatted: '',
    };
  }

  const records = getAllRecords();
  const lastCheckin = records[getRecordKey(userId, treeId)];

  if (!lastCheckin) {
    return {
      canCheckin: true,
      lastCheckinTimestamp: null,
      nextAllowedTimestamp: null,
      remainingMs: 0,
      remainingFormatted: '',
    };
  }

  const now = Date.now();
  const elapsed = now - lastCheckin;
  const remainingMs = Math.max(0, COOLDOWN_DURATION_MS - elapsed);

  if (remainingMs <= 0) {
    return {
      canCheckin: true,
      lastCheckinTimestamp: lastCheckin,
      nextAllowedTimestamp: null,
      remainingMs: 0,
      remainingFormatted: '',
    };
  }

  return {
    canCheckin: false,
    lastCheckinTimestamp: lastCheckin,
    nextAllowedTimestamp: lastCheckin + COOLDOWN_DURATION_MS,
    remainingMs,
    remainingFormatted: formatCooldownTime(remainingMs, lang),
  };
}

/**
 * Optional helper to clear all check-ins for testing
 */
export function clearAllCheckinRecords(): void {
  try {
    localStorage.removeItem(CHECKIN_STORAGE_KEY);
  } catch {
    // Ignore
  }
}
