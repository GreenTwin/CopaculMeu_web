import { beforeEach, describe, expect, it } from 'vitest';
import {
  LOCAL_ADMIN_ID,
  USERS_TABLE_COLUMNS,
  listLocalUsers,
  localUserRows,
  readLocalFlags,
  removeLocalUser,
  resetLocalUsers,
  responseOmitsSecrets,
  toAdminListUser,
  updateLocalUser,
  type UsersTableRow,
} from './localPreview';

describe('readLocalFlags', () => {
  it('readLocalFlags_productionIgnoresFlags', () => {
    expect(readLocalFlags({
      dev: false,
      adminFlag: 'true',
      usersFlag: 'true',
      search: '?localAdmin=1&localUsers=1',
    })).toEqual({ admin: false, users: false });
  });

  it('readLocalFlags_devEnvTurnsBothOn', () => {
    expect(readLocalFlags({
      dev: true,
      adminFlag: 'true',
      usersFlag: 'true',
      search: '',
    })).toEqual({ admin: true, users: true });
  });

  it('readLocalFlags_devQueryTurnsOneFlagOn', () => {
    expect(readLocalFlags({
      dev: true,
      search: '?localAdmin=1',
    })).toEqual({ admin: true, users: false });
  });

  it('readLocalFlags_devWithoutFlagStaysOff', () => {
    expect(readLocalFlags({ dev: true, search: '' })).toEqual({ admin: false, users: false });
  });

  it('readLocalFlags_queryZeroOverridesTheEnvFlag', () => {
    expect(readLocalFlags({
      dev: true,
      adminFlag: 'true',
      usersFlag: 'true',
      search: '?localAdmin=0&localUsers=0',
    })).toEqual({ admin: false, users: false });
  });
});

describe('local dummy users', () => {
  beforeEach(() => {
    resetLocalUsers();
  });

  it('localUserRows_matchTheLiveUsersTable', () => {
    const rows = localUserRows();
    expect(rows.length).toBeGreaterThan(1);
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual([...USERS_TABLE_COLUMNS].sort());
      expect(row).not.toHaveProperty('last_login_at');
    }
    const google = rows.find((row) => row.auth_method === 'GOOGLE');
    const apple = rows.find((row) => row.auth_method === 'APPLE');
    const password = rows.find((row) => row.auth_method === 'PASSWORD');
    expect(google?.password_hash).toBeNull();
    expect(google?.google_sub).toBeTruthy();
    expect(apple?.apple_sub).toBeTruthy();
    expect(apple?.google_sub).toBeNull();
    expect(password?.password_hash).toBeTruthy();
    expect(password?.auth_method).toBe('PASSWORD');
  });

  it('toAdminListUser_omitsSecretsAndKeepsPublicColumns', () => {
    const row = localUserRows()[0];
    const user = toAdminListUser(row);
    expect(responseOmitsSecrets(user)).toBe(true);
    expect(user.id).toBe(row.id);
    expect(user.email).toBe(row.email);
    expect(user.role).toBe(row.role);
    expect(user.status).toBe(row.status);
    expect(user.createdAt).toBe(row.created_at);
    expect(user.updatedAt).toBe(row.updated_at);
    expect(user.lastLoginAt).toBeUndefined();
    expect(JSON.stringify(user)).not.toContain('local-preview-password-hash');
    expect(JSON.stringify(user)).not.toContain('local-google-subject');
    expect(JSON.stringify(user)).not.toContain('local-apple-subject');
  });

  it('listLocalUsers_emptyFilterReturnsNoRows', () => {
    const page = listLocalUsers({ status: 'PENDING_APPROVAL' });
    expect(page.empty).toBe(true);
    expect(page.content).toEqual([]);
  });

  it('updateLocalUser_ownRoleStaysAndNameChanges', () => {
    expect(() => updateLocalUser(LOCAL_ADMIN_ID, { role: 'USER' }, LOCAL_ADMIN_ID)).toThrow(
      'You cannot change your own role'
    );
    expect(localUserRows().find((row) => row.id === LOCAL_ADMIN_ID)?.role).toBe('ADMIN');

    const renamed = updateLocalUser(LOCAL_ADMIN_ID, { name: 'Renamed Admin' }, LOCAL_ADMIN_ID);
    expect(renamed.name).toBe('Renamed Admin');
    expect(renamed.role).toBe('ADMIN');
  });

  it('updateLocalUser_unknownUserThrows', () => {
    expect(() => updateLocalUser('missing', { name: 'Nope' }, LOCAL_ADMIN_ID)).toThrow('User not found');
  });

  it('removeLocalUser_deletesAnotherRowAndRefusesSelf', () => {
    const other = localUserRows().find((row) => row.id !== LOCAL_ADMIN_ID) as UsersTableRow;
    expect(() => removeLocalUser(LOCAL_ADMIN_ID, LOCAL_ADMIN_ID)).toThrow(
      'You cannot delete your own account'
    );
    expect(localUserRows().some((row) => row.id === LOCAL_ADMIN_ID)).toBe(true);

    removeLocalUser(other.id, LOCAL_ADMIN_ID);
    expect(localUserRows().some((row) => row.id === other.id)).toBe(false);
    expect(localUserRows().some((row) => row.id === LOCAL_ADMIN_ID)).toBe(true);
  });
});
