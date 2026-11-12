import { rebuildArtwork } from '../artwork/rebuild-artwork';
import { renderArtwork } from '../artwork/render-artwork';
import { elements } from '../dom/elements';
import { getElement } from '../dom/get-element';
import { model } from '../state/model';
import { notify } from '../ui/notify';
import { bindRange } from './bind-range';

/** Connect subject sampling, contrast, background density, and mask-reset controls. */
export function bindSubjectEvents(): void {
  bindRange(elements.subjectThreshold, elements.subjectThresholdValue, (value) => {
    model.subjectThreshold = value;
    rebuildArtwork();
  });
  bindRange(elements.subjectContrast, elements.subjectContrastValue, (value) => {
    model.subjectContrast = value;
    rebuildArtwork();
  });
  bindRange(elements.backgroundDensity, elements.backgroundDensityValue, (value) => {
    model.backgroundDensity = value;
    rebuildArtwork();
  });
  bindRange(elements.backgroundScatter, elements.backgroundScatterValue, (value) => {
    model.backgroundScatter = value;
    renderArtwork();
  });
  elements.subjectEnabled.addEventListener('change', () => {
    model.subjectEnabled = elements.subjectEnabled.checked;
    elements.subjectControls.classList.toggle('is-disabled', !model.subjectEnabled);
    rebuildArtwork();
  });
  getElement('shuffle-background').addEventListener('click', () => {
    model.randomSeed = Math.floor(Math.random() * 999_999) + 1;
    rebuildArtwork();
    notify('Background pattern reshuffled.');
  });
  getElement('reset-mask').addEventListener('click', () => {
    model.manualSubjectMask.clear();
    getElement('reset-mask').classList.add('is-hidden');
    rebuildArtwork();
    notify('Automatic subject selection restored.');
  });
}
