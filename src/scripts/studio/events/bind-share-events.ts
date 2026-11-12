import { elements } from "../dom/elements";
import { getElement } from "../dom/get-element";
import { copySvg } from "../sharing/copy-svg";
import { downloadPng } from "../sharing/download-png";
import { downloadSvg } from "../sharing/download-svg";
import { openShareDialog } from "../sharing/open-share-dialog";
import { sharePngWithDevice } from "../sharing/share-png-with-device";
import { runtime } from "../state/runtime";

/** Connect the share dialog and its native, download, and clipboard actions. */
export function bindShareEvents(): void {
  elements.shareDialog.addEventListener("close", () => {
    runtime.shareSnapshot = null;
  });
  document.querySelectorAll<HTMLButtonElement>('[data-action="share"]').forEach((button) => {
    button.addEventListener("click", openShareDialog);
  });
  getElement("share-native").addEventListener("click", () => void sharePngWithDevice());
  getElement("share-download-png").addEventListener("click", () => {
    void downloadPng();
    elements.shareDialog.close();
  });
  getElement("share-download-svg").addEventListener("click", () => {
    downloadSvg();
    elements.shareDialog.close();
  });
  getElement("share-copy-svg").addEventListener("click", () => {
    void copySvg();
    elements.shareDialog.close();
  });
}
