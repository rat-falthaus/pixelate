import type { FaceDetector, ObjectDetector } from '@mediapipe/tasks-vision';

/** Detection bounds are normalized to the exact artwork source, after camera cropping/mirroring. */
export interface SubjectRegion {
  left: number;
  top: number;
  right: number;
  bottom: number;
  score: number;
  label: string;
}

export interface SubjectDetectors {
  faces: FaceDetector;
  objects: ObjectDetector;
}
