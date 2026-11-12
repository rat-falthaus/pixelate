import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

/** Initialize the CPU hand tracker using only bundled model and WASM assets. */
export async function createHandLandmarker(baseUrl: string): Promise<HandLandmarker> {
  const assetBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const vision = await FilesetResolver.forVisionTasks(`${assetBase}vendor/mediapipe/wasm`);
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: `${assetBase}models/hand_landmarker.task`, delegate: 'CPU' },
    runningMode: 'VIDEO',
    numHands: 1,
    minHandDetectionConfidence: 0.6,
    minHandPresenceConfidence: 0.6,
    minTrackingConfidence: 0.6,
  });
}
