import { elements } from '../dom/elements';
import { runtime } from '../state/runtime';
import { closeCamera } from './close-camera';
import { getCameraConstraints } from './get-camera-constraints';
import { refreshCameraDevices } from './refresh-camera-devices';
import { notify } from '../ui/notify';

/** Open the still-camera dialog and request a local video stream with visible failure feedback. */
export async function openCamera(): Promise<void> {
  if (elements.cameraDialog.open) return;
  const request = ++runtime.cameraRequest;
  elements.cameraStatus.textContent = 'Requesting camera access…';
  elements.cameraStatus.classList.remove('is-hidden');
  elements.cameraDialog.showModal();
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera access is not available in this browser or page context.');
    }
    const stream = await navigator.mediaDevices.getUserMedia(getCameraConstraints());
    if (request !== runtime.cameraRequest || !elements.cameraDialog.open) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    runtime.cameraStream = stream;
    stream.getVideoTracks().forEach((track) =>
      track.addEventListener('ended', () => {
        if (runtime.cameraStream !== stream) return;
        closeCamera();
        notify('Camera disconnected. Select another input in admin settings.');
      }),
    );
    elements.cameraVideo.srcObject = stream;
    await elements.cameraVideo.play();
    if (request !== runtime.cameraRequest) return;
    void refreshCameraDevices();
    elements.cameraStatus.classList.add('is-hidden');
  } catch (error) {
    if (request !== runtime.cameraRequest) return;
    runtime.cameraStream?.getTracks().forEach((track) => track.stop());
    runtime.cameraStream = null;
    elements.cameraVideo.srcObject = null;
    elements.cameraStatus.textContent =
      error instanceof Error
        ? `${error.message} You can still add a photo file.`
        : 'Camera access was denied. You can still add a photo file.';
  }
}
