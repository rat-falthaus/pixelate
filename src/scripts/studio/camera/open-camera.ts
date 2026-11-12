import { elements } from '../dom/elements';
import { runtime } from '../state/runtime';

/** Open the still-camera dialog and request a local video stream with visible failure feedback. */
export async function openCamera(): Promise<void> {
  elements.cameraStatus.textContent = 'Requesting camera access…';
  elements.cameraStatus.classList.remove('is-hidden');
  elements.cameraDialog.showModal();
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera access is not available in this browser or page context.');
    }
    runtime.cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 900 }, height: { ideal: 700 } },
      audio: false,
    });
    elements.cameraVideo.srcObject = runtime.cameraStream;
    elements.cameraStatus.classList.add('is-hidden');
  } catch (error) {
    elements.cameraStatus.textContent =
      error instanceof Error
        ? `${error.message} You can still add a photo file.`
        : 'Camera access was denied. You can still add a photo file.';
  }
}
