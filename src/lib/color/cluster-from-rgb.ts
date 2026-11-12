import type { ColorCluster } from '../types';
import { luminance } from './luminance';
import { rgbToHex } from './rgb-to-hex';
import type { RGB } from './types';

/** Create palette-cluster metadata from RGB channel values. */
export function clusterFromRgb({ r, g, b }: RGB): ColorCluster {
  return { r, g, b, hex: rgbToHex(r, g, b), luminance: luminance({ r, g, b }) };
}
