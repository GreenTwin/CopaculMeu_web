import { describe, expect, it } from 'vitest';
import { PHONE_QUICK_ACTIONS } from './quickActionList';

describe('PHONE_QUICK_ACTIONS', () => {
  it('phoneQuickActions_areAddTreeThenNeedsWater', () => {
    expect(PHONE_QUICK_ACTIONS).toEqual(['addTree', 'needsWater']);
  });
});
