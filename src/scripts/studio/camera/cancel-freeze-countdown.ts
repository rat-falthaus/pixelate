import { getElement } from "../dom/get-element";
import { runtime } from "../state/runtime";

/** Release the countdown handle so camera restarts and later gestures can capture again. */
export function cancelFreezeCountdown(): void {
  window.clearInterval(runtime.gestureCountdownTimer);
  runtime.gestureCountdownTimer = 0;
  getElement("gesture-countdown").classList.add("is-hidden");
}
