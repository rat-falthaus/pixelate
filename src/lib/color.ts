import type { ColorCluster } from './types';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function rgbToHex(r: number, g: number, b: number): string {
  const byte = (value: number) => Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, '0');
  return `#${byte(r)}${byte(g)}${byte(b)}`.toUpperCase();
}

export function hexToRgb(hex: string): RGB {
  const value = hex.replace('#', '');
  const parsed = Number.parseInt(value, 16);
  return { r: (parsed >> 16) & 255, g: (parsed >> 8) & 255, b: parsed & 255 };
}

export function luminance({ r, g, b }: RGB): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function colorDistance(left: RGB, right: RGB): number {
  const dr = left.r - right.r;
  const dg = left.g - right.g;
  const db = left.b - right.b;
  return 0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db;
}

export function clusterFromRgb({ r, g, b }: RGB): ColorCluster {
  return { r, g, b, hex: rgbToHex(r, g, b), luminance: luminance({ r, g, b }) };
}

export function seededRandom(seed: number): () => number {
  let value = (seed >>> 0) || 1;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function isAllowedPaletteColor(hex: string): boolean {
  if (!/^#[\da-f]{6}$/i.test(hex)) return false;
  const brightness = luminance(hexToRgb(hex));
  return brightness >= 14 && brightness <= 245;
}

export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  })[character]!);
}
