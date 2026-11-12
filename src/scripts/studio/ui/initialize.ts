import { setBackground } from '../artwork/set-background';
import { setTool } from '../artwork/set-tool';
import { loadBrandAssets } from '../branding/load-brand-assets';
import { elements } from '../dom/elements';
import { bindEvents } from '../events/bind-events';
import { refreshGallery } from '../gallery/refresh-gallery';
import { model } from '../state/model';
import { applyWorkspaceSettings } from './apply-workspace-settings';
import { notify } from './notify';
import { updateLiveUi } from './update-live-ui';

/** Bind the interface, restore local assets and portraits, and apply initial workspace state. */
export async function initialize(): Promise<void> {
  bindEvents();
  try {
    await loadBrandAssets();
  } catch (error) {
    console.error('Saved brand assets could not be restored.', error);
    notify(error instanceof Error ? error.message : 'Saved brand assets could not be restored.');
  }
  try {
    await refreshGallery();
  } catch (error) {
    console.error('The local portrait gallery is unavailable.', error);
    notify(error instanceof Error ? error.message : 'Local portrait storage is unavailable.');
  }
  elements.subjectThresholdValue.textContent = `${model.subjectThreshold}%`;
  elements.subjectContrastValue.textContent = `${model.subjectContrast}%`;
  elements.backgroundDensityValue.textContent = `${model.backgroundDensity}%`;
  elements.backgroundScatterValue.textContent = `${model.backgroundScatter}%`;
  elements.messageScaleValue.textContent = `${model.messageScale}%`;
  elements.messageText.value = model.message;
  elements.freeColorCountValue.textContent = String(model.freeColorCount);
  elements.includeBackground.checked = model.includeBackground;
  elements.subjectEnabled.checked = model.subjectEnabled;
  elements.messageEnabled.checked = model.messageEnabled;
  elements.showBadge.checked = model.showBadge;
  model.messagePosition = model.config.messagePosition;
  applyWorkspaceSettings();
  setBackground('black');
  setTool('pan');
  updateLiveUi();
}
