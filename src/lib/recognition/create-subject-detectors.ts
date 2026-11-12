import { FaceDetector, FilesetResolver, ObjectDetector } from '@mediapipe/tasks-vision';
import type { SubjectDetectors } from './types';

/** Load pinned, same-origin CPU models; no CDN or remote inference is involved. */
export async function createSubjectDetectors(baseUrl: string): Promise<SubjectDetectors> {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const vision = await FilesetResolver.forVisionTasks(`${base}vendor/mediapipe/wasm`);
  const objects = await ObjectDetector.createFromOptions(vision, {
    baseOptions: { modelAssetPath: `${base}models/efficientdet_lite0.tflite`, delegate: 'CPU' },
    runningMode: 'IMAGE',
    maxResults: 8,
    scoreThreshold: 0.45,
  });
  try {
    const faces = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `${base}models/blaze_face_short_range.tflite`,
        delegate: 'CPU',
      },
      runningMode: 'IMAGE',
      minDetectionConfidence: 0.5,
    });
    return { faces, objects };
  } catch (error) {
    objects.close();
    throw error;
  }
}
