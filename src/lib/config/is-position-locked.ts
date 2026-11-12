import type { StudioConfig } from '../types';

/** Enforce admin overlay locks for kiosk visitors, not normal studio editing. */
export function isPositionLocked(config: StudioConfig, overlay: 'message' | 'logo'): boolean {
  const locked = overlay === 'message' ? config.messagePositionLocked : config.logoPositionLocked;
  return config.fairMode && locked;
}
