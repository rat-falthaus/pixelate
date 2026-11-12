import type { ImageSource } from '../types';
import { detectSubjectRegions } from './detect-subject-regions';
import { segmentSubjectRegions } from './segment-subject-regions';
import type { SubjectDetectors, SubjectMask, SubjectRegion } from './types';

/** Detect and segment the same bounded snapshot, preserving crop/mirror alignment in photo and live mode. */
export function analyzeSubjectShapes(
  image: ImageSource,
  detectors: SubjectDetectors,
): { regions: SubjectRegion[]; mask: SubjectMask } {
  const width = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
  const height = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
  const scale = Math.min(1, 640 / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Subject recognition could not prepare an image.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const regions = detectSubjectRegions(canvas, detectors);
  return { regions, mask: segmentSubjectRegions(canvas, regions, detectors.segmenter) };
}
