import type { SubjectRegion } from './types';

/** Assign confidence to cell centers inside detected bounds; empty detections mean all background. */
export function createRegionSaliency(
  regions: SubjectRegion[],
  cols: number,
  rows: number,
): Float32Array {
  const saliency = new Float32Array(cols * rows);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = (col + 0.5) / cols;
      const y = (row + 0.5) / rows;
      for (const region of regions) {
        if (x >= region.left && x < region.right && y >= region.top && y < region.bottom) {
          saliency[row * cols + col] = Math.max(saliency[row * cols + col], region.score);
        }
      }
    }
  }
  return saliency;
}
