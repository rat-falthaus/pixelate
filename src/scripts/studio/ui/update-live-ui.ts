import { elements } from '../dom/elements';
import { renderBrandIdentity } from '../branding/render-brand-identity';
import { getElement } from '../dom/get-element';
import { model } from '../state/model';

/** Synchronize camera status, empty-state visibility, and visitor position locks. */
export function updateLiveUi(): void {
  const fairMode = model.config.fairMode;
  const hasArtwork = Boolean(model.image);
  renderBrandIdentity();
  elements.emptyState.classList.toggle('is-hidden', hasArtwork || fairMode);
  elements.livePrompt.classList.toggle('is-hidden', !fairMode || hasArtwork);
  elements.liveIndicator.classList.toggle('is-active', model.liveCameraActive);
  elements.liveStatus.textContent = model.liveCameraActive
    ? model.freezePreview
      ? 'Portrait preview'
      : 'Live portrait'
    : hasArtwork
      ? 'Portrait ready'
      : 'Fair portrait studio';
  getElement('live-camera-label').textContent = model.liveCameraActive
    ? 'Snap & freeze'
    : 'New portrait';
  getElement('live-camera').setAttribute(
    'aria-label',
    model.liveCameraActive ? 'Freeze this portrait' : 'Start a new portrait',
  );
  getElement('return-to-live').classList.toggle('is-hidden', !model.freezePreview);
  getElement('freeze-preview-actions').classList.toggle('is-hidden', !model.freezePreview);
  getElement('logo-section').classList.toggle(
    'is-hidden',
    model.config.logoPositionLocked || (!model.logoDataUrl && !model.config.brandSignature),
  );
  getElement('drawer-open').setAttribute(
    'aria-expanded',
    String(document.body.classList.contains('drawer-open')),
  );
  document.querySelectorAll<HTMLButtonElement>('[data-position]').forEach((button) => {
    button.disabled = model.config.messagePositionLocked;
  });
  document.querySelectorAll<HTMLButtonElement>('[data-logo-position]').forEach((button) => {
    button.disabled = model.config.logoPositionLocked;
    button.classList.toggle(
      'is-selected',
      button.dataset.logoPosition === model.config.logoPosition,
    );
  });
}
