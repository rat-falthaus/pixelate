import { normalizeDetectionRegion } from './normalize-detection-region';
import type { SubjectDetectors, SubjectRegion } from './types';

/** Locate segmentation prompts on an already bounded snapshot of the artwork source. */
export function detectSubjectRegions(
  canvas: HTMLCanvasElement,
  detectors: SubjectDetectors,
): SubjectRegion[] {
  const regions: SubjectRegion[] = [];
  for (const [result, face] of [
    [detectors.faces.detect(canvas), true],
    [detectors.objects.detect(canvas), false],
  ] as const) {
    for (const detection of result.detections) {
      const category = detection.categories[0];
      if (!detection.boundingBox || !category) continue;
      const region = normalizeDetectionRegion(
        detection.boundingBox,
        canvas.width,
        canvas.height,
        category.score,
        face ? 'face' : category.categoryName || 'object',
      );
      if (region) regions.push(region);
    }
  }
  return regions;
}
