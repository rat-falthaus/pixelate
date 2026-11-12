import type { InteractiveSegmenterLegacy } from '@mediapipe/tasks-vision';
import { createMaskSaliency } from './create-mask-saliency';
import { isSubjectMask } from './is-subject-mask';
import type { SubjectMask, SubjectRegion } from './types';

/** Union learned object silhouettes, never their bounds; reuse coverage for nested face/object prompts. */
export function segmentSubjectRegions(
  canvas: HTMLCanvasElement,
  regions: SubjectRegion[],
  segmenter: InteractiveSegmenterLegacy,
): SubjectMask {
  const mask: SubjectMask = {
    width: canvas.width,
    height: canvas.height,
    confidence: new Float32Array(canvas.width * canvas.height),
  };
  const ordered = [...regions].sort(
    (a, b) => (b.right - b.left) * (b.bottom - b.top) - (a.right - a.left) * (a.bottom - a.top),
  );
  for (const region of ordered) {
    const width = region.right - region.left;
    const height = region.bottom - region.top;
    const center = { x: region.left + width / 2, y: region.top + height / 2 };
    const face =
      region.label === 'person'
        ? regions.find(
            (candidate) =>
              candidate.label === 'face' &&
              candidate.left >= region.left &&
              candidate.right <= region.right &&
              candidate.top >= region.top &&
              candidate.bottom <= region.bottom,
          )
        : undefined;
    const prompts = [
      ...(face ? [{ x: (face.left + face.right) / 2, y: (face.top + face.bottom) / 2 }] : []),
      center,
      { x: region.left + width * 0.2, y: center.y },
      { x: region.left + width * 0.8, y: center.y },
      { x: center.x, y: region.top + height * 0.8 },
    ];
    if (
      prompts.every((point) => {
        const pixel =
          Math.min(mask.height - 1, Math.floor(point.y * mask.height)) * mask.width +
          Math.min(mask.width - 1, Math.floor(point.x * mask.width));
        return mask.confidence[pixel] >= 0.85;
      })
    )
      continue;
    for (const point of prompts) {
      let accepted = false;
      segmenter.segment(canvas, { keypoint: point }, (result) => {
        // This MagicTouch task exposes one foreground mask, not the raw model's two channels.
        const foreground = result.confidenceMasks?.[0];
        if (!foreground) throw new Error('The silhouette model did not return a foreground mask.');
        const candidate: SubjectMask = {
          width: foreground.width,
          height: foreground.height,
          confidence: foreground.getAsFloat32Array(),
        };
        if (!isSubjectMask(candidate, region)) return;
        const confidence =
          candidate.width === mask.width && candidate.height === mask.height
            ? candidate.confidence
            : createMaskSaliency(candidate, mask.width, mask.height);
        for (let pixel = 0; pixel < mask.confidence.length; pixel += 1) {
          mask.confidence[pixel] = Math.max(mask.confidence[pixel], confidence[pixel]);
        }
        accepted = true;
      });
      if (accepted) break;
    }
  }
  return mask;
}
