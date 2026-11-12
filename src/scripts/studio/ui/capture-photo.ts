import { closeCamera } from '../camera/close-camera';
import { elements } from '../dom/elements';
import { loadImage } from '../photo/load-image';
import { notify } from './notify';

/** Mirror the current still-camera frame and load it as an editable photo. */
export async function capturePhoto(): Promise<void> {
  const video = elements.cameraVideo;
  if (!video.videoWidth || !video.videoHeight) {
    notify('Wait for the camera preview to become ready.');
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');
  if (!context) {
    notify('Could not capture from the camera.');
    return;
  }
  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  try {
    await loadImage(
      canvas.toDataURL('image/png'),
      `visitor-${Date.now().toString().slice(-5)}.png`,
    );
    closeCamera();
    notify('Photo captured and pixelated.');
  } catch (error) {
    notify(error instanceof Error ? error.message : 'Could not use the captured photo.');
  }
}
