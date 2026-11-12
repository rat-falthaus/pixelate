import { elements } from '../dom/elements';
import { model } from '../state/model';
import { runtime } from '../state/runtime';
import { closeCamera } from './close-camera';
import { openCamera } from './open-camera';
import { startLiveCamera } from './start-live-camera';
import { stopLiveCamera } from './stop-live-camera';

/** Release the previous input before applying a newly saved camera choice. */
export async function restartSelectedCamera(): Promise<void> {
  if (model.liveCameraActive || runtime.liveCameraStarting) {
    stopLiveCamera(false);
    await startLiveCamera();
  } else if (elements.cameraDialog.open) {
    closeCamera();
    await openCamera();
  }
}
