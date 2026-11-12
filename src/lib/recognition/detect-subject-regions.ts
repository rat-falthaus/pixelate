import type { ImageSource } from '../types';
import { normalizeDetectionRegion } from './normalize-detection-region';
import type { SubjectDetectors, SubjectRegion } from './types';

/** Detect faces/common objects on a bounded copy of the exact source used by the sampler. */
export function detectSubjectRegions(
  image: ImageSource,
  detectors: SubjectDetectors,
): SubjectRegion[] {
  const width = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
  const height = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
  const scale = Math.min(1, 640 / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Subject recognition could not prepare an image.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
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
