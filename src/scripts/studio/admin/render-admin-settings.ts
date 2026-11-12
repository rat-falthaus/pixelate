import { getElement } from '../dom/get-element';
import { model } from '../state/model';
import { refreshCameraDevices } from '../camera/refresh-camera-devices';
import { renderThemeColors } from './render-theme-colors';

/** Populate admin controls from the saved configuration and loaded brand assets. */
export function renderAdminSettings(): void {
  const camera = getElement('setting-camera') as HTMLSelectElement;
  if (
    model.config.cameraDeviceId &&
    !Array.from(camera.options).some((option) => option.value === model.config.cameraDeviceId)
  ) {
    camera.add(new Option('Saved camera (checking availability)', model.config.cameraDeviceId));
  }
  camera.value = model.config.cameraDeviceId;
  camera.dataset.initialized = 'true';
  void refreshCameraDevices();
  (getElement('setting-lock-palette') as HTMLInputElement).checked = model.config.enforceTheme;
  (getElement('setting-fair-mode') as HTMLInputElement).checked = model.config.fairMode;
  (getElement('setting-title') as HTMLInputElement).value = model.config.applicationTitle;
  (getElement('setting-signature') as HTMLInputElement).value = model.config.brandSignature;
  (getElement('setting-message') as HTMLTextAreaElement).value = model.config.defaultMessage;
  (getElement('setting-message-position') as HTMLSelectElement).value =
    model.config.messagePosition;
  (getElement('setting-lock-message-position') as HTMLInputElement).checked =
    model.config.messagePositionLocked;
  (getElement('setting-logo-position') as HTMLSelectElement).value = model.config.logoPosition;
  (getElement('setting-lock-logo-position') as HTMLInputElement).checked =
    model.config.logoPositionLocked;
  (getElement('setting-clear-gallery') as HTMLInputElement).checked =
    model.config.clearGalleryAfterShare;
  (getElement('setting-gallery-delay') as HTMLInputElement).value = String(
    model.config.galleryClearDelaySeconds,
  );
  (getElement('setting-font-choice') as HTMLSelectElement).value = model.config.useUploadedFont
    ? 'uploaded'
    : 'system';
  getElement('setting-font-name').textContent = model.fontDataUri
    ? 'Uploaded font ready'
    : 'System font';
  const logoPreview = getElement('setting-logo-preview') as HTMLImageElement;
  logoPreview.src = model.logoDataUrl ?? '';
  logoPreview.classList.toggle('is-hidden', !model.logoDataUrl);
  (getElement('setting-dark-cutoff') as HTMLInputElement).value = String(
    model.config.darkCutoffPercent,
  );
  (getElement('setting-light-cutoff') as HTMLInputElement).value = String(
    model.config.lightCutoffPercent,
  );
  (getElement('setting-hairlines') as HTMLInputElement).checked = model.config.hairlines;
  (getElement('setting-pin') as HTMLInputElement).value = '';
  getElement('dark-cutoff-value').textContent = `${model.config.darkCutoffPercent}%`;
  getElement('light-cutoff-value').textContent = `${model.config.lightCutoffPercent}%`;

  const permissionIds: Record<keyof typeof model.config.permissions, string> = {
    subject: 'permission-subject',
    message: 'permission-message',
    size: 'permission-size',
    background: 'permission-background',
    mapping: 'permission-mapping',
    recolor: 'permission-recolor',
  };
  Object.entries(permissionIds).forEach(([permission, id]) => {
    (getElement(id) as HTMLInputElement).checked =
      model.config.permissions[permission as keyof typeof model.config.permissions];
  });

  const themeSelect = getElement('setting-theme') as HTMLSelectElement;
  themeSelect.replaceChildren();
  model.config.themes.forEach((theme) => {
    const option = document.createElement('option');
    option.value = theme.id;
    option.textContent = `${theme.name} · ${theme.colors.length}`;
    option.selected = theme.id === model.config.activeThemeId;
    themeSelect.append(option);
  });
  renderThemeColors();
}
