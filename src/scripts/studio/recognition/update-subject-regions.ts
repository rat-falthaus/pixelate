import { detectSubjectRegions } from '../../../lib/recognition';
import type { ImageSource } from '../../../lib/types';
import { getElement } from '../dom/get-element';
import { model } from '../state/model';
import { runtime } from '../state/runtime';
import { notify } from '../ui/notify';

/** Replace rather than accumulate detections, so moving/absent subjects never leave stale masks. */
export function updateSubjectRegions(image: ImageSource): void {
  if (!runtime.subjectDetectors) {
    model.subjectRegions = null;
    return;
  }
  try {
    model.subjectRegions = detectSubjectRegions(image, runtime.subjectDetectors);
    const labels = [...new Set(model.subjectRegions.map((region) => region.label))];
    getElement('recognition-status').textContent = labels.length
      ? `Recognized locally: ${labels.join(', ')}.`
      : 'No subject detected. Move closer or use the subject brush.';
  } catch (error) {
    console.error('Subject recognition stopped.', error);
    runtime.subjectDetectors.faces.close();
    runtime.subjectDetectors.objects.close();
    runtime.subjectDetectors = null;
    model.subjectRegions = null;
    getElement('recognition-status').textContent =
      'Recognition unavailable - heuristic subject controls are active.';
    notify('Subject recognition stopped. Heuristic subject controls remain available.');
  }
}
