import { saveGalleryFreeze } from '../../../lib/local-store';
import { elements } from '../dom/elements';
import { refreshGallery } from '../gallery/refresh-gallery';
import { setImageSource } from '../photo/set-image-source';
import { createPngBlob } from '../sharing/create-png-blob';
import { model } from '../state/model';
import { runtime } from '../state/runtime';
import { notify } from '../ui/notify';
import { updateLiveUi } from '../ui/update-live-ui';
import { drawCameraFrame } from './draw-camera-frame';
import { returnToLive } from './return-to-live';

/** Capture and save a portrait, then schedule the return to live video after three seconds. */
export function freezeLiveFrame(): void {
  if (!model.liveCameraActive || !runtime.liveFrameCanvas) return;
  const frozenFrame = document.createElement('canvas');
  if (!drawCameraFrame(elements.liveCameraVideo, frozenFrame, 1500)) {
    notify('The camera frame is not ready yet.');
    return;
  }
  model.freezePreview = true;
  setImageSource(frozenFrame, `portrait-${new Date().toISOString().slice(0, 10)}.png`);
  updateLiveUi();
  window.clearTimeout(runtime.freezePreviewTimer);
  runtime.freezePreviewTimer = window.setTimeout(returnToLive, 3000);
  void createPngBlob()
    .then(saveGalleryFreeze)
    .then(() => refreshGallery())
    .catch((error: unknown) => {
      console.error('The frozen portrait could not be saved to the local gallery.', error);
      notify(
        error instanceof Error ? error.message : 'The portrait could not be saved to the gallery.',
      );
    });
  notify('Portrait frozen for 3 seconds and saved to the gallery.');
}
