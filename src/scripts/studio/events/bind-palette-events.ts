import { getActiveTheme } from "../../../lib/config";
import { mapClustersToTheme } from "../../../lib/sampling";
import { randomizeColors } from "../artwork/randomize-colors";
import { renderArtwork } from "../artwork/render-artwork";
import { renderMapping } from "../artwork/render-mapping";
import { getElement } from "../dom/get-element";
import { model } from "../state/model";
import { notify } from "../ui/notify";

/** Connect palette rotation, shuffle, and automatic tone-mapping controls. */
export function bindPaletteEvents(): void {
  getElement("rotate-colors").addEventListener("click", () => {
    const length = getActiveTheme(model.config).colors.length;
    model.clusterToTheme = model.clusterToTheme.map((index) => (index + 1) % length);
    renderMapping();
    renderArtwork();
    notify("Brand colors rotated.");
  });
  getElement("randomize-look").addEventListener("click", () => {
    randomizeColors();
  });
  getElement("auto-map").addEventListener("click", () => {
    model.clusterToTheme = mapClustersToTheme(model.clusters, getActiveTheme(model.config).colors);
    renderMapping();
    renderArtwork();
    notify("Photo tones mapped to the closest brand colors.");
  });
}
