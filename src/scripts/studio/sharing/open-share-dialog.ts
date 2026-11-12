import { stopLiveCamera } from '../camera/stop-live-camera';
import { elements } from '../dom/elements';
import { model } from '../state/model';
import { notify } from '../ui/notify';

/** Freeze live artwork when necessary and reveal supported export and sharing options. */
export function openShareDialog(): void {
  if (!model.image || !model.currentSvg) {
    notify('Take a photo or choose one before sharing.');
    return;
  }
  if (model.liveCameraActive) stopLiveCamera(true);
  elements.shareNative.hidden = typeof navigator.share !== 'function';
  elements.shareDialog.showModal();
}
