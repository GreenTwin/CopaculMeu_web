export const PHONE_QUICK_ACTIONS = ['addTree', 'needsWater'] as const;

export type PhoneQuickAction = (typeof PHONE_QUICK_ACTIONS)[number];
