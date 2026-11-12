import { openAdminGate } from '../admin/open-admin-gate';
import { randomizeColors } from '../artwork/randomize-colors';
import { closeCamera } from '../camera/close-camera';
import { freezeLiveCamera } from '../camera/freeze-live-camera';
import { openCamera } from '../camera/open-camera';
import { returnToLive } from '../camera/return-to-live';
import { startLiveCamera } from '../camera/start-live-camera';
import { getElement } from '../dom/get-element';
import { openGallery } from '../gallery/open-gallery';
import { shareSelectedGalleryFreezes } from '../gallery/share-selected-gallery-freezes';
import { capturePhoto } from '../ui/capture-photo';

/** Connect still-camera, live-camera, and gallery toolbar actions. */
export function bindCameraEvents(): void {
  getElement('camera-open').addEventListener('click', () => void openCamera());
  getElement('capture-photo').addEventListener('click', () => void capturePhoto());
  getElement('camera-dialog').addEventListener('close', closeCamera);
  getElement('live-start-camera').addEventListener('click', () => void startLiveCamera());
  getElement('live-camera').addEventListener('click', freezeLiveCamera);
  getElement('live-new-colors').addEventListener('click', randomizeColors);
  getElement('live-admin').addEventListener('click', openAdminGate);
  getElement('gallery-open').addEventListener('click', () => void openGallery());
  getElement('gallery-close').addEventListener('click', () =>
    getElement('gallery-overlay').classList.add('is-hidden'),
  );
  getElement('gallery-share').addEventListener('click', () => void shareSelectedGalleryFreezes());
  getElement('return-to-live').addEventListener('click', returnToLive);
}
