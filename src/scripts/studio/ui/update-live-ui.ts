import { elements } from '../dom/elements';
import { getElement } from '../dom/get-element';
import { model } from '../state/model';

/** Synchronize camera status, empty-state visibility, and visitor position locks. */
export function updateLiveUi(): void {
  const fairMode = model.config.fairMode;
  const hasArtwork = Boolean(model.image);
  elements.liveBrandTitle.textContent = model.config.applicationTitle;
  elements.livePromptBrand.textContent = model.config.applicationTitle;
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
  getElement('drawer-open').setAttribute(
    'aria-expanded',
    String(document.body.classList.contains('drawer-open')),
  );
  document.querySelectorAll<HTMLButtonElement>('[data-position]').forEach((button) => {
    button.disabled = model.config.messagePositionLocked;
  });
}
