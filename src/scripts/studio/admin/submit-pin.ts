import { elements } from '../dom/elements';
import { model } from '../state/model';
import { renderAdminSettings } from './render-admin-settings';

/** Validate the convenience PIN and open admin settings when it matches. */
export function submitPin(): void {
  if (elements.pinInput.value !== model.config.adminPin) {
    elements.pinError.classList.remove('is-hidden');
    elements.pinInput.value = '';
    return;
  }
  elements.pinDialog.close();
  renderAdminSettings();
  elements.adminDialog.showModal();
}
