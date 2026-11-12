import { elements } from '../dom/elements';
import { runtime } from '../state/runtime';

/** Stop the still-camera tracks and close its preview dialog. */
export function closeCamera(): void {
  runtime.cameraStream?.getTracks().forEach((track) => track.stop());
  runtime.cameraStream = null;
  elements.cameraVideo.srcObject = null;
  if (elements.cameraDialog.open) elements.cameraDialog.close();
}
