import { elements } from "../dom/elements";
import { model } from "../state/model";

/** Apply only the automatic cover-fit scale; visitors cannot pan or zoom the image. */
export function updateViewportTransform(): void {
  elements.transform.style.transform = `scale(${model.fitScale})`;
}
