import { elements } from '../dom/elements';
import { runtime } from '../state/runtime';

/** Display a transient status message, replacing any previous toast. */
export function notify(message: string): void {
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  window.clearTimeout(runtime.toastTimer);
  runtime.toastTimer = window.setTimeout(() => elements.toast.classList.remove('is-visible'), 2600);
}
