import type { RGB } from './types';

/** Return the luminance-weighted squared distance between two RGB colors. */
export function colorDistance(left: RGB, right: RGB): number {
  const dr = left.r - right.r;
  const dg = left.g - right.g;
  const db = left.b - right.b;
  return 0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db;
}
