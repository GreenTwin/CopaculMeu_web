export const PHONE_LAYOUT_MAX_WIDTH = 767;

export function isPhoneLayout(width: number): boolean {
  return width <= PHONE_LAYOUT_MAX_WIDTH;
}

export function showsMapZoomControl(width: number): boolean {
  return !isPhoneLayout(width);
}
