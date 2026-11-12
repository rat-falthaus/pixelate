import { model } from '../state/model';
import { updateViewportTransform } from './update-viewport-transform';

/** Clamp the requested zoom level and update the artboard transform. */
export function setZoom(value: number): void {
  model.zoom = Math.max(0.15, Math.min(4, value));
  updateViewportTransform();
}
