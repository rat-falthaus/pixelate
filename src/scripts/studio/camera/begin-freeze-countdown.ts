import { getElement } from '../dom/get-element';
import { model } from '../state/model';
import { runtime } from '../state/runtime';
import { freezeLiveFrame } from './freeze-live-frame';
import { cancelFreezeCountdown } from './cancel-freeze-countdown';
import { updateLiveUi } from '../ui/update-live-ui';

/** Show a three-second countdown before capturing a live portrait. */
export function beginFreezeCountdown(): void {
  if (!model.liveCameraActive || model.freezePreview || runtime.gestureCountdownTimer) return;
  runtime.gestureStartedAt = 0;
  runtime.gesturePalmPoint = null;
  runtime.gestureArmed = false;
  let count = 3;
  getElement('gesture-count').textContent = String(count);
  getElement('gesture-countdown').classList.remove('is-hidden');
  updateLiveUi();
  runtime.gestureCountdownTimer = window.setInterval(() => {
    count -= 1;
    if (count > 0) {
      getElement('gesture-count').textContent = String(count);
      return;
    }
    cancelFreezeCountdown();
    freezeLiveFrame();
  }, 1000);
}
