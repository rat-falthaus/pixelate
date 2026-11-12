import type { BoundingBox } from '@mediapipe/tasks-vision';
import type { SubjectRegion } from './types';

/** Clip pixel bounds to a normalized source-space region, rejecting empty or invalid detections. */
export function normalizeDetectionRegion(
  box: BoundingBox,
  width: number,
  height: number,
  score: number,
  label: string,
): SubjectRegion | null {
  if (
    ![box.originX, box.originY, box.width, box.height, width, height, score].every(
      Number.isFinite,
    ) ||
    width <= 0 ||
    height <= 0 ||
    box.width <= 0 ||
    box.height <= 0
  )
    return null;
  const left = Math.max(0, Math.min(1, box.originX / width));
  const top = Math.max(0, Math.min(1, box.originY / height));
  const right = Math.max(0, Math.min(1, (box.originX + box.width) / width));
  const bottom = Math.max(0, Math.min(1, (box.originY + box.height) / height));
  if (right <= left || bottom <= top) return null;
  return { left, top, right, bottom, score: Math.max(0, Math.min(1, score)), label };
}
