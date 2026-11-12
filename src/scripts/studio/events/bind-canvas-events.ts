import type { BackgroundMode } from "../../../lib/types";
import { rebuildArtwork } from "../artwork/rebuild-artwork";
import { renderArtwork } from "../artwork/render-artwork";
import { setBackground } from "../artwork/set-background";
import { syncTileSize } from "../artwork/sync-tile-size";
import { elements } from "../dom/elements";
import { model } from "../state/model";
import { bindRange } from "./bind-range";

/** Connect tile sizing and spacing, palette size, and canvas-background controls. */
export function bindCanvasEvents(): void {
  elements.tileSize.addEventListener("input", () => syncTileSize(elements.tileSize.value));
  elements.tileSizeNumber.addEventListener("change", () =>
    syncTileSize(elements.tileSizeNumber.value),
  );
  bindRange(elements.tileSpacing, elements.tileSpacingValue, (value) => {
    model.tileSpacingPercent = value;
    renderArtwork();
  });
  document.querySelectorAll<HTMLButtonElement>("[data-size]").forEach((button) => {
    button.addEventListener("click", () => syncTileSize(button.dataset.size ?? "18"));
  });
  bindRange(
    elements.freeColorCount,
    elements.freeColorCountValue,
    (value) => {
      model.freeColorCount = value;
      rebuildArtwork();
    },
    "",
  );
  document.querySelectorAll<HTMLButtonElement>("[data-background]").forEach((button) => {
    button.addEventListener("click", () =>
      setBackground(button.dataset.background as BackgroundMode),
    );
  });
  elements.includeBackground.addEventListener("change", () => {
    model.includeBackground = elements.includeBackground.checked;
    renderArtwork();
  });
}
