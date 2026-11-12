import { setImageSource } from '../photo/set-image-source';
import { model } from '../state/model';
import { runtime } from '../state/runtime';
import { updateLiveUi } from '../ui/update-live-ui';
import { updateSubjectRegions } from '../recognition/update-subject-regions';

/** Cancel the frozen preview and restore the active live camera canvas. */
export function returnToLive(): void {
  window.clearTimeout(runtime.freezePreviewTimer);
  if (!model.liveCameraActive || !runtime.liveFrameCanvas) return;
  model.freezePreview = false;
  updateSubjectRegions(runtime.liveFrameCanvas);
  setImageSource(runtime.liveFrameCanvas, 'live-portrait.png');
  updateLiveUi();
}
