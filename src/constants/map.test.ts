import { describe, expect, it } from 'vitest';
import { MAP_ZOOM_CONTROL_POSITION } from './map';

describe('MAP_ZOOM_CONTROL_POSITION', () => {
  it('mapZoomControl_isBottomRight', () => {
    expect(MAP_ZOOM_CONTROL_POSITION).toBe('bottomright');
  });
});
