import { elements } from '../dom/elements';
import { model } from '../state/model';
import { updateViewportTransform } from './update-viewport-transform';

/** Cover the actual stage with centered artwork, without visitor-controlled zoom. */
export function fitArtboard(): void {
  const stage = elements.stage.getBoundingClientRect();
  const width = elements.artboard.offsetWidth;
  const height = elements.artboard.offsetHeight;
  if (!width || !height || !stage.width || !stage.height) return;
  model.fitScale = Math.max(stage.width / width, stage.height / height);
  updateViewportTransform();
}
