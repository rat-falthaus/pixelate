import type { HandLandmarker } from "@mediapipe/tasks-vision";
import type { GalleryFreeze } from "../../../lib/local-store";
import type { SubjectDetectors } from "../../../lib/recognition";
import type { ArtworkSnapshot } from "../../../lib/types";

/** Mutable browser resources and interaction state, shared by studio actions. */
interface RuntimeState {
  publicKioskMode: boolean;
  activeImageUrl: string | null;
  cameraStream: MediaStream | null;
  cameraRequest: number;
  liveCameraStream: MediaStream | null;
  liveCameraRequest: number;
  liveCameraStarting: boolean;
  liveFrameCanvas: HTMLCanvasElement | null;
  liveFrameRequest: number;
  lastLiveFrameAt: number;
  toastTimer: number;
  processFrame: number;
  messageDragOffset: { col: number; row: number };
  logoDragOffset: { col: number; row: number };
  handLandmarker: HandLandmarker | null;
  handLandmarkerLoading: Promise<HandLandmarker> | null;
  subjectDetectors: SubjectDetectors | null;
  subjectDetectorsLoading: Promise<SubjectDetectors> | null;
  lastSubjectFrameAt: number;
  gestureStartedAt: number;
  gestureArmed: boolean;
  gesturePalmPoint: { x: number; y: number } | null;
  lastGestureFrameAt: number;
  gestureCountdownTimer: number;
  freezePreviewTimer: number;
  galleryObjectUrls: string[];
  selectedGalleryIds: Set<string>;
  previewFreeze: GalleryFreeze | null;
  galleryPreviewRequest: number;
  pendingGalleryPreviewId: string | null;
  shareSnapshot: ArtworkSnapshot | null;
  painting: boolean;
  pendingSubjectEdit: boolean;
}

export const runtime: RuntimeState = {
  publicKioskMode: false,
  activeImageUrl: null,
  cameraStream: null,
  cameraRequest: 0,
  liveCameraStream: null,
  liveCameraRequest: 0,
  liveCameraStarting: false,
  liveFrameCanvas: null,
  liveFrameRequest: 0,
  lastLiveFrameAt: 0,
  toastTimer: 0,
  processFrame: 0,
  messageDragOffset: { col: 0, row: 0 },
  logoDragOffset: { col: 0, row: 0 },
  handLandmarker: null,
  handLandmarkerLoading: null,
  subjectDetectors: null,
  subjectDetectorsLoading: null,
  lastSubjectFrameAt: 0,
  gestureStartedAt: 0,
  gestureArmed: true,
  gesturePalmPoint: null,
  lastGestureFrameAt: 0,
  gestureCountdownTimer: 0,
  freezePreviewTimer: 0,
  galleryObjectUrls: [],
  selectedGalleryIds: new Set<string>(),
  previewFreeze: null,
  galleryPreviewRequest: 0,
  pendingGalleryPreviewId: null,
  shareSnapshot: null,
  painting: false,
  pendingSubjectEdit: false,
};
