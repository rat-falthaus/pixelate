import { elements } from "../dom/elements";
import { model } from "../state/model";
import { notify } from "../ui/notify";
import { runtime } from "../state/runtime";
import { getExportSnapshot } from "./get-export-snapshot";

/** Keep live video running while sharing a fixed snapshot of the selected artwork. */
export function openShareDialog(): void {
  if (!model.image || !model.currentSvg) {
    notify("Take a photo or choose one before sharing.");
    return;
  }
  runtime.shareSnapshot = getExportSnapshot();
  elements.shareNative.hidden = typeof navigator.share !== "function";
  elements.shareDialog.showModal();
}
