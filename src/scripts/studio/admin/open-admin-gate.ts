import { elements } from '../dom/elements';

/** Reset the local PIN prompt and focus its input. */
export function openAdminGate(): void {
  elements.pinInput.value = '';
  elements.pinError.classList.add('is-hidden');
  elements.pinDialog.showModal();
  elements.pinInput.focus();
}
