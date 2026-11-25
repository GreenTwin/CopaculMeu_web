export const MOBILE_MENU_SECTIONS = ['map', 'account', 'preferences'] as const;

export type MobileMenuSection = (typeof MOBILE_MENU_SECTIONS)[number];
