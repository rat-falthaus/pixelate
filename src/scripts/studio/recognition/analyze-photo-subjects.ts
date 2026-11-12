import type { ImageSource } from '../../../lib/types';
import { rebuildArtwork } from '../artwork/rebuild-artwork';
import { getElement } from '../dom/get-element';
import { model } from '../state/model';
import { runtime } from '../state/runtime';
import { notify } from '../ui/notify';
import { ensureSubjectDetectors } from './ensure-subject-detectors';
import { updateSubjectMask } from './update-subject-mask';

/** Upgrade the current photo to ML-aware sampling without allowing an old upload to replace new input. */
export async function analyzePhotoSubjects(image: ImageSource): Promise<void> {
  try {
    await ensureSubjectDetectors();
    if (model.image !== image || model.liveCameraActive || runtime.previewFreeze) return;
    updateSubjectMask(image);
    rebuildArtwork();
  } catch (error) {
    console.error('Local subject recognition could not be initialized.', error);
    getElement('recognition-status').textContent =
      'Recognition unavailable - heuristic subject controls are active.';
    notify('Face/object recognition is unavailable. Heuristic subject controls remain available.');
  }
}
