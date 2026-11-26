import type { User } from '../types/auth';
import type { UserPageResponse } from '../types/admin';

export const USERS_TABLE_COLUMNS = [
  'id',
  'email',
  'password_hash',
  'salt',
  'hash_version',
  'role',
  'status',
  'name',
  'created_at',
  'updated_at',
  'google_sub',
  'apple_sub',
  'auth_method',
  'password_changed_at',
] as const;

export type UsersTableColumn = (typeof USERS_TABLE_COLUMNS)[number];

export interface UsersTableRow {
  id: string;
  email: string;
  password_hash: string | null;
  salt: string | null;
  hash_version: string | null;
  role: 'USER' | 'ADMIN';
  status: 'UNCONFIRMED' | 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED';
  name: string | null;
  created_at: string;
  updated_at: string;
  google_sub: string | null;
  apple_sub: string | null;
  auth_method: 'PASSWORD' | 'GOOGLE' | 'APPLE';
  password_changed_at: string | null;
}

export const LOCAL_ADMIN_ID = '00000000-0000-4000-8000-000000000001';

const SECRET_RESPONSE_KEYS = [
  'password_hash',
  'salt',
  'hash_version',
  'google_sub',
  'apple_sub',
] as const;

interface LocalFlagInput {
  dev: boolean;
  adminFlag?: string;
  usersFlag?: string;
  search?: string;
}

export function readLocalFlags(input: LocalFlagInput): { admin: boolean; users: boolean } {
  if (!input.dev) {
    return { admin: false, users: false };
  }
  const params = new URLSearchParams(input.search ?? '');
  const adminOff = params.get('localAdmin') === '0';
  const usersOff = params.get('localUsers') === '0';
  return {
    admin: !adminOff && (input.adminFlag === 'true' || params.get('localAdmin') === '1'),
    users: !usersOff && (input.usersFlag === 'true' || params.get('localUsers') === '1'),
  };
}

function currentFlags() {
  return readLocalFlags({
    dev: import.meta.env.DEV,
    adminFlag: import.meta.env.VITE_LOCAL_ADMIN,
    usersFlag: import.meta.env.VITE_LOCAL_DUMMY_USERS,
    search: typeof window === 'undefined' ? '' : window.location.search,
  });
}

export function localAdminEnabled(): boolean {
  return currentFlags().admin;
}

export function localDummyUsersEnabled(): boolean {
  return currentFlags().users;
}

function seedRows(): UsersTableRow[] {
  return [
    {
      id: LOCAL_ADMIN_ID,
      email: 'local.admin@example.com',
      password_hash: 'local-preview-password-hash',
      salt: 'local-preview-salt',
      hash_version: 'V1',
      role: 'ADMIN',
      status: 'ACTIVE',
      name: 'Local Admin',
      created_at: '2026-01-10T08:00:00Z',
      updated_at: '2026-11-01T09:00:00Z',
      google_sub: null,
      apple_sub: null,
      auth_method: 'PASSWORD',
      password_changed_at: '2026-06-01T08:00:00Z',
    },
    {
      id: '00000000-0000-4000-8000-000000000002',
      email: 'ana.volunteer@example.com',
      password_hash: 'local-preview-password-hash',
      salt: 'local-preview-salt',
      hash_version: 'V1',
      role: 'USER',
      status: 'ACTIVE',
      name: 'Ana Volunteer',
      created_at: '2026-02-02T09:30:00Z',
      updated_at: '2026-10-12T14:00:00Z',
      google_sub: null,
      apple_sub: null,
      auth_method: 'PASSWORD',
      password_changed_at: null,
    },
    {
      id: '00000000-0000-4000-8000-000000000003',
      email: 'unconfirmed@example.com',
      password_hash: 'local-preview-password-hash',
      salt: 'local-preview-salt',
      hash_version: 'V1',
      role: 'USER',
      status: 'UNCONFIRMED',
      name: null,
      created_at: '2026-03-03T11:00:00Z',
      updated_at: '2026-03-03T11:00:00Z',
      google_sub: null,
      apple_sub: null,
      auth_method: 'PASSWORD',
      password_changed_at: null,
    },
    {
      id: '00000000-0000-4000-8000-000000000004',
      email: 'suspended@example.com',
      password_hash: 'local-preview-password-hash',
      salt: 'local-preview-salt',
      hash_version: 'V1',
      role: 'USER',
      status: 'SUSPENDED',
      name: 'Suspended Volunteer',
      created_at: '2026-04-04T12:00:00Z',
      updated_at: '2026-09-01T12:00:00Z',
      google_sub: null,
      apple_sub: null,
      auth_method: 'PASSWORD',
      password_changed_at: '2026-04-04T12:00:00Z',
    },
    {
      id: '00000000-0000-4000-8000-000000000005',
      email: 'google.volunteer@example.com',
      password_hash: null,
      salt: null,
      hash_version: null,
      role: 'USER',
      status: 'ACTIVE',
      name: 'Google Volunteer',
      created_at: '2026-05-05T13:00:00Z',
      updated_at: '2026-05-05T13:00:00Z',
      google_sub: 'local-google-subject',
      apple_sub: null,
      auth_method: 'GOOGLE',
      password_changed_at: null,
    },
    {
      id: '00000000-0000-4000-8000-000000000006',
      email: 'apple.volunteer@example.com',
      password_hash: null,
      salt: null,
      hash_version: null,
      role: 'USER',
      status: 'ACTIVE',
      name: 'Apple Volunteer',
      created_at: '2026-06-06T14:00:00Z',
      updated_at: '2026-06-06T14:00:00Z',
      google_sub: null,
      apple_sub: 'local-apple-subject',
      auth_method: 'APPLE',
      password_changed_at: null,
    },
  ];
}

const TREES_ADDED: Record<string, number> = {
  [LOCAL_ADMIN_ID]: 1,
  '00000000-0000-4000-8000-000000000002': 2,
};

let rows: UsersTableRow[] = seedRows();

export function resetLocalUsers(): void {
  rows = seedRows();
}

export function localUserRows(): UsersTableRow[] {
  return rows.map((row) => ({ ...row }));
}

export function toAdminListUser(row: UsersTableRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? '',
    role: row.role,
    status: row.status === 'PENDING_APPROVAL' ? 'UNCONFIRMED' : row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    treesAdded: TREES_ADDED[row.id] ?? 0,
  };
}

export function localAdminProfile(): User {
  const admin = seedRows().find((row) => row.id === LOCAL_ADMIN_ID);
  if (!admin) {
    throw new Error('Local admin row is missing');
  }
  return toAdminListUser(admin);
}

export function responseOmitsSecrets(user: User): boolean {
  const record = user as User & Record<(typeof SECRET_RESPONSE_KEYS)[number], unknown>;
  return SECRET_RESPONSE_KEYS.every((key) => record[key] === undefined);
}

export function listLocalUsers(params?: {
  page?: number;
  size?: number;
  status?: string;
  role?: string;
}): UserPageResponse {
  const size = params?.size && params.size > 0 ? params.size : 20;
  const page = params?.page && params.page > 0 ? params.page : 0;
  const filtered = rows.filter((row) => {
    if (params?.status && row.status !== params.status) return false;
    if (params?.role && row.role !== params.role) return false;
    return true;
  });
  const start = page * size;
  const content = filtered.slice(start, start + size).map(toAdminListUser);
  const totalPages = filtered.length === 0 ? 0 : Math.ceil(filtered.length / size);
  return {
    content,
    totalElements: filtered.length,
    totalPages,
    size,
    number: page,
    first: page === 0,
    last: totalPages === 0 || page >= totalPages - 1,
    empty: content.length === 0,
  };
}

export function updateLocalUser(
  id: string,
  body: { name?: string; role?: User['role'] },
  callerId: string | null
): User {
  if (body.name === undefined && body.role === undefined) {
    throw new Error('Name or role is required');
  }
  const row = rows.find((item) => item.id === id);
  if (!row) {
    throw new Error('User not found');
  }
  if (body.role !== undefined && body.role !== 'USER' && body.role !== 'ADMIN') {
    throw new Error('Role must be USER or ADMIN');
  }
  if (body.role !== undefined && callerId === row.id && body.role !== row.role) {
    throw new Error('You cannot change your own role');
  }
  if (body.role !== undefined) {
    row.role = body.role;
  }
  if (body.name !== undefined) {
    const trimmed = body.name.trim();
    row.name = trimmed === '' ? null : trimmed;
  }
  row.updated_at = new Date().toISOString();
  return toAdminListUser(row);
}

export function removeLocalUser(id: string, callerId: string | null): void {
  const row = rows.find((item) => item.id === id);
  if (!row) {
    throw new Error('User not found');
  }
  if (callerId !== null && callerId === row.id) {
    throw new Error('You cannot delete your own account');
  }
  rows = rows.filter((item) => item.id !== id);
}

export function setLocalUserStatus(id: string, status: UsersTableRow['status']): User {
  const row = rows.find((item) => item.id === id);
  if (!row) {
    throw new Error('User not found');
  }
  row.status = status;
  row.updated_at = new Date().toISOString();
  return toAdminListUser(row);
}
