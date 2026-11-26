import { describe, expect, it } from 'vitest';
import {
  USER_TABLE_COLUMNS,
  formatAdminTimestamp,
  userTableWidthsFillTheRow,
} from './userDirectory';

describe('user directory layout', () => {
  it('userTable_columnsFillTheRowAndOmitActions', () => {
    expect(userTableWidthsFillTheRow()).toBe(100);
    expect(USER_TABLE_COLUMNS.map((column) => column.key)).toEqual([
      'name',
      'email',
      'type',
      'lastLogin',
      'createdAt',
      'trees',
      'status',
    ]);
  });

  it('formatAdminTimestamp_blankAndInvalidStayEmpty', () => {
    expect(formatAdminTimestamp()).toBe('');
    expect(formatAdminTimestamp(null)).toBe('');
    expect(formatAdminTimestamp('')).toBe('');
    expect(formatAdminTimestamp('not-a-date')).toBe('');
  });

  it('formatAdminTimestamp_everyValueHasTheSameLength', () => {
    const morning = formatAdminTimestamp('2026-01-10T08:00:00Z');
    const evening = formatAdminTimestamp('2026-11-02T21:05:00Z');
    expect(morning).toMatch(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/);
    expect(evening).toMatch(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/);
    expect(morning.length).toBe(evening.length);
  });
});
