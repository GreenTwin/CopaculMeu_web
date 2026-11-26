export const USER_TABLE_COLUMNS = [
  { key: 'name', widthPercent: 17 },
  { key: 'email', widthPercent: 23 },
  { key: 'type', widthPercent: 11 },
  { key: 'lastLogin', widthPercent: 13 },
  { key: 'createdAt', widthPercent: 13 },
  { key: 'trees', widthPercent: 10 },
  { key: 'status', widthPercent: 13 },
] as const;

export const USER_TABLE_ROW_HEIGHT_PX = 52;
export const USER_TABLE_CONTROL_HEIGHT_PX = 36;

export function userTableWidthsFillTheRow(): number {
  return USER_TABLE_COLUMNS.reduce((sum, column) => sum + column.widthPercent, 0);
}

export function formatAdminTimestamp(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}
