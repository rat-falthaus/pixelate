import { getElement } from '../dom/get-element';
import { model } from '../state/model';
import { runtime } from '../state/runtime';
import { freezeLiveFrame } from './freeze-live-frame';

/** Show a three-second countdown before capturing a live portrait. */
export function beginFreezeCountdown(): void {
  if (!model.liveCameraActive || runtime.gestureCountdownTimer) return;
  runtime.gestureStartedAt = 0;
  runtime.gesturePalmPoint = null;
  let count = 3;
  getElement('gesture-count').textContent = String(count);
  getElement('gesture-countdown').classList.remove('is-hidden');
  runtime.gestureCountdownTimer = window.setInterval(() => {
    count -= 1;
    if (count > 0) {
      getElement('gesture-count').textContent = String(count);
      return;
    }
    window.clearInterval(runtime.gestureCountdownTimer);
    runtime.gestureCountdownTimer = 0;
    getElement('gesture-countdown').classList.add('is-hidden');
    freezeLiveFrame();
  }, 1000);
}
