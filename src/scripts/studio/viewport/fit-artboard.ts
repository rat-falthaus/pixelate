import { elements } from '../dom/elements';
import { model } from '../state/model';
import { updateViewportTransform } from './update-viewport-transform';

/** Fit the artwork to the stage, using edge-to-edge framing in kiosk mode. */
export function fitArtboard(): void {
  const stage = elements.stage.getBoundingClientRect();
  const width = model.gridCols * model.tileSize;
  const height = model.gridRows * model.tileSize;
  if (!width || !height || !stage.width || !stage.height) return;
  const padding = model.config.fairMode ? 0 : 72;
  model.zoom = Math.max(
    0.15,
    Math.min(
      2.5,
      Math.min(
        Math.max(1, stage.width - padding) / width,
        Math.max(1, stage.height - padding) / height,
      ),
    ),
  );
  model.panX = 0;
  model.panY = 0;
  updateViewportTransform();
}
