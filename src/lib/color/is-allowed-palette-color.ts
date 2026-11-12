import { hexToRgb } from './hex-to-rgb';
import { luminance } from './luminance';

/** Validate a six-digit palette color and reject near-black or near-white tones. */
export function isAllowedPaletteColor(hex: string): boolean {
  if (!/^#[\da-f]{6}$/i.test(hex)) return false;
  const brightness = luminance(hexToRgb(hex));
  return brightness >= 14 && brightness <= 245;
}
