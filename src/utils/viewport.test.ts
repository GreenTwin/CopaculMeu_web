import { describe, expect, it } from 'vitest';
import { isPhoneLayout, showsMapZoomControl } from './viewport';

describe('isPhoneLayout', () => {
  it('isPhoneLayout_below768_isTrue', () => {
    expect(isPhoneLayout(390)).toBe(true);
    expect(isPhoneLayout(767)).toBe(true);
  });

  it('isPhoneLayout_768AndWider_isFalse', () => {
    expect(isPhoneLayout(768)).toBe(false);
    expect(isPhoneLayout(1280)).toBe(false);
  });

  it('showsMapZoomControl_onPhone_isFalse', () => {
    expect(showsMapZoomControl(390)).toBe(false);
    expect(showsMapZoomControl(767)).toBe(false);
  });

  it('showsMapZoomControl_from768_isTrue', () => {
    expect(showsMapZoomControl(768)).toBe(true);
    expect(showsMapZoomControl(1280)).toBe(true);
  });
});
