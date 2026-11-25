import { describe, expect, it } from 'vitest';
import { MOBILE_MENU_SECTIONS } from './mobileMenuSections';

describe('MOBILE_MENU_SECTIONS', () => {
  it('mobileMenuSections_areMapThenAccountThenPreferences', () => {
    expect(MOBILE_MENU_SECTIONS).toEqual(['map', 'account', 'preferences']);
  });
});
