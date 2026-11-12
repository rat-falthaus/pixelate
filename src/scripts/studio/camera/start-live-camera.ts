import { elements } from '../dom/elements';
import { setImageSource } from '../photo/set-image-source';
import { model } from '../state/model';
import { runtime } from '../state/runtime';
import { notify } from '../ui/notify';
import { updateLiveUi } from '../ui/update-live-ui';
import { drawCameraFrame } from './draw-camera-frame';
import { updateLiveFrame } from './update-live-frame';
import { getCameraConstraints } from './get-camera-constraints';
import { refreshCameraDevices } from './refresh-camera-devices';
import { stopLiveCamera } from './stop-live-camera';
import { initializeCameraRecognition } from '../recognition/initialize-camera-recognition';

/** Start real camera rendering immediately; optional local recognition loads independently afterward. */
export async function startLiveCamera(): Promise<void> {
  if (model.liveCameraActive || runtime.liveCameraStarting) return;
  elements.liveCameraError.classList.add('is-hidden');
  if (!navigator.mediaDevices?.getUserMedia) {
    elements.liveCameraError.textContent =
      'Camera access is unavailable here. Choose a photo instead.';
    elements.liveCameraError.classList.remove('is-hidden');
    notify('Camera access is unavailable. Choose a photo instead.');
    return;
  }
  const request = ++runtime.liveCameraRequest;
  runtime.liveCameraStarting = true;

  let fullscreenRequest = Promise.resolve(Boolean(document.fullscreenElement));
  if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
    try {
      fullscreenRequest = document.documentElement
        .requestFullscreen()
        .then(() => true)
        .catch(() => false);
    } catch {
      fullscreenRequest = Promise.resolve(false);
    }
  }
  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia(getCameraConstraints());
    if (request !== runtime.liveCameraRequest) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    elements.liveCameraVideo.srcObject = stream;
    await elements.liveCameraVideo.play();
    if (!elements.liveCameraVideo.videoWidth) {
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(
          () => reject(new Error('The camera preview did not become ready.')),
          5000,
        );
        elements.liveCameraVideo.addEventListener(
          'loadeddata',
          () => {
            window.clearTimeout(timeout);
            resolve();
          },
          { once: true },
        );
      });
    }
    if (request !== runtime.liveCameraRequest) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    runtime.liveCameraStream = stream;
    const activeStream = stream;
    activeStream.getVideoTracks().forEach((track) =>
      track.addEventListener('ended', () => {
        if (runtime.liveCameraStream !== activeStream) return;
        stopLiveCamera(false);
        notify('Camera disconnected. Choose an available camera in admin settings.');
      }),
    );
    stream = null;
    runtime.liveFrameCanvas = document.createElement('canvas');
    if (!drawCameraFrame(elements.liveCameraVideo, runtime.liveFrameCanvas, 900)) {
      throw new Error('The camera did not provide an image.');
    }
    model.liveCameraActive = true;
    model.freezePreview = false;
    model.subjectRegions = null;
    runtime.liveCameraStarting = false;
    setImageSource(runtime.liveFrameCanvas, 'live-portrait.png');
    runtime.lastLiveFrameAt = 0;
    runtime.lastSubjectFrameAt = 0;
    runtime.liveFrameRequest = requestAnimationFrame(updateLiveFrame);
    void refreshCameraDevices();
    void initializeCameraRecognition();
    const enteredFullscreen = await fullscreenRequest;
    if (request !== runtime.liveCameraRequest || !model.liveCameraActive) return;
    notify(
      enteredFullscreen
        ? 'Live portrait is ready. Tap “Snap & freeze” to keep it.'
        : 'Live portrait is ready. Fullscreen is unavailable here; tap “Snap & freeze” to keep it.',
    );
  } catch (error) {
    stream?.getTracks().forEach((track) => track.stop());
    if (request !== runtime.liveCameraRequest) return;
    runtime.liveCameraStream?.getTracks().forEach((track) => track.stop());
    runtime.liveCameraStream = null;
    runtime.liveFrameCanvas = null;
    elements.liveCameraVideo.srcObject = null;
    model.liveCameraActive = false;
    runtime.liveCameraStarting = false;
    const message = error instanceof Error ? error.message : 'Camera access was denied.';
    elements.liveCameraError.textContent = `${message} You can still choose a photo.`;
    elements.liveCameraError.classList.remove('is-hidden');
    updateLiveUi();
    notify(`${message} You can still choose a photo.`);
  } finally {
    if (request === runtime.liveCameraRequest) runtime.liveCameraStarting = false;
  }
}
