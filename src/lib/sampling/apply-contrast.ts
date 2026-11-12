/** Apply a centered contrast curve and clamp the resulting channel to a byte range. */
export function applyContrast(value: number, factor: number): number {
  const normalized = value / 255 - 0.5;
  return Math.max(0, Math.min(255, (normalized * factor + 0.5) * 255));
}
