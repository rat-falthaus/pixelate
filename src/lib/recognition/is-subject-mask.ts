import type { SubjectMask, SubjectRegion } from './types';

/** Reject background selections when a box's center lands in a hole or beside the actual object. */
export function isSubjectMask(mask: SubjectMask, region: SubjectRegion): boolean {
  let inside = 0;
  let outside = 0;
  let insideCount = 0;
  let outsideCount = 0;
  for (let row = 0; row < mask.height; row += 1) {
    for (let col = 0; col < mask.width; col += 1) {
      const x = (col + 0.5) / mask.width;
      const y = (row + 0.5) / mask.height;
      const value = mask.confidence[row * mask.width + col];
      if (x >= region.left && x < region.right && y >= region.top && y < region.bottom) {
        inside += value;
        insideCount += 1;
      } else {
        outside += value;
        outsideCount += 1;
      }
    }
  }
  return (
    insideCount > 0 &&
    inside / insideCount > Math.max(0.05, outside / Math.max(1, outsideCount) + 0.02)
  );
}
