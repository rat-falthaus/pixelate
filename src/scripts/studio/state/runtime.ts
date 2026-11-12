import type { HandLandmarker } from '@mediapipe/tasks-vision';

/** Mutable browser resources and interaction state, shared by studio actions. */
interface RuntimeState {
  activeImageUrl: string | null;
  cameraStream: MediaStream | null;
  liveCameraStream: MediaStream | null;
  liveFrameCanvas: HTMLCanvasElement | null;
  liveFrameRequest: number;
  lastLiveFrameAt: number;
  toastTimer: number;
  processFrame: number;
  pointerStart: { x: number; y: number; panX: number; panY: number } | null;
  messageDragOffset: { col: number; row: number };
  logoDragOffset: { col: number; row: number };
  handLandmarker: HandLandmarker | null;
  gestureStartedAt: number;
  gesturePalmPoint: { x: number; y: number } | null;
  lastGestureFrameAt: number;
  gestureCountdownTimer: number;
  freezePreviewTimer: number;
  galleryObjectUrls: string[];
  selectedGalleryIds: Set<string>;
  painting: boolean;
  pendingSubjectEdit: boolean;
}

export const runtime: RuntimeState = {
  activeImageUrl: null,
  cameraStream: null,
  liveCameraStream: null,
  liveFrameCanvas: null,
  liveFrameRequest: 0,
  lastLiveFrameAt: 0,
  toastTimer: 0,
  processFrame: 0,
  pointerStart: null,
  messageDragOffset: { col: 0, row: 0 },
  logoDragOffset: { col: 0, row: 0 },
  handLandmarker: null,
  gestureStartedAt: 0,
  gesturePalmPoint: null,
  lastGestureFrameAt: 0,
  gestureCountdownTimer: 0,
  freezePreviewTimer: 0,
  galleryObjectUrls: [],
  selectedGalleryIds: new Set<string>(),
  painting: false,
  pendingSubjectEdit: false,
};
