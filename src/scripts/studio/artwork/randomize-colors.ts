import { getActiveTheme } from "../../../lib/config";
import { model } from "../state/model";
import { runtime } from "../state/runtime";
import { notify } from "../ui/notify";
import { renderArtwork } from "./render-artwork";
import { renderMapping } from "./render-mapping";

/** Shuffle the cluster-to-palette mapping and regenerate the background pattern. */
export function randomizeColors(): void {
  if (runtime.previewFreeze) {
    notify("Saved portraits stay unchanged. Return to live or open a photo to choose new colors.");
    return;
  }
  if (!model.clusters.length) {
    notify("Take a photo before choosing new colors.");
    return;
  }
  const colors = getActiveTheme(model.config).colors;
  const shuffled = Array.from({ length: colors.length }, (_, index) => index);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  model.clusterToTheme = model.clusters.map((_, index) => shuffled[index % shuffled.length]);
  model.randomSeed = Math.floor(Math.random() * 999_999) + 1;
  renderMapping();
  renderArtwork();
  notify("A fresh colorway is ready.");
}
