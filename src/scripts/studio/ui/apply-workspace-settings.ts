import { getActiveTheme } from "../../../lib/config";
import { rebuildArtwork } from "../artwork/rebuild-artwork";
import { renderMapping } from "../artwork/render-mapping";
import { elements } from "../dom/elements";
import { getElement } from "../dom/get-element";
import { model } from "../state/model";
import { fitArtboard } from "../viewport/fit-artboard";
import { setDrawerOpen } from "../viewport/set-drawer-open";
import { notify } from "./notify";
import { updateLiveUi } from "./update-live-ui";
import { requestLiveFullscreen } from "../camera/request-live-fullscreen";
import { isKioskMode } from "../state/is-kiosk-mode";
import { updateFullscreenUi } from "./update-fullscreen-ui";

/** Apply brand identity and kiosk permissions without discarding the current artwork. */
export function applyWorkspaceSettings(): void {
  const fairMode = isKioskMode();
  const leavingFairMode = document.body.classList.contains("fair-mode") && !fairMode;
  const enteringFairMode = !document.body.classList.contains("fair-mode") && fairMode;
  if (enteringFairMode && model.config.fairMode) {
    void requestLiveFullscreen().then((entered) => {
      if (!entered && isKioskMode()) {
        notify("Fullscreen is unavailable. The live preview remains active.");
      }
    });
  }
  if (leavingFairMode && document.fullscreenElement) {
    void document.exitFullscreen().catch((error: unknown) => {
      console.error("Could not exit fullscreen mode.", error);
      notify("Could not leave fullscreen mode. Press Escape to exit.");
    });
  }
  const theme = getActiveTheme(model.config);
  document.title = `${model.config.applicationTitle} — Photo to SVG`;
  elements.modeLabel.textContent = fairMode
    ? "Fair kiosk"
    : model.config.enforceTheme
      ? theme.name
      : "Free palette";
  document.body.classList.toggle("fair-mode", fairMode);
  document.querySelectorAll<HTMLElement>(".fair-hide").forEach((element) => {
    element.classList.toggle("is-hidden", fairMode);
  });
  const hideIfVisitorCannot = (id: string, permission: keyof typeof model.config.permissions) => {
    getElement(id).classList.toggle("is-hidden", fairMode && !model.config.permissions[permission]);
  };
  hideIfVisitorCannot("subject-section", "subject");
  hideIfVisitorCannot("message-section", "message");
  hideIfVisitorCannot("tile-size-section", "size");
  hideIfVisitorCannot("canvas-section", "background");
  hideIfVisitorCannot("brush-section", "recolor");
  elements.mappingList.classList.toggle("is-hidden", fairMode && !model.config.permissions.mapping);
  elements.mappingControls.classList.toggle(
    "is-hidden",
    !model.config.enforceTheme || (fairMode && !model.config.permissions.mapping),
  );
  getElement("free-palette-controls").classList.toggle(
    "is-hidden",
    model.config.enforceTheme || fairMode,
  );
  updateLiveUi();
  updateFullscreenUi();
  if (fairMode || leavingFairMode) setDrawerOpen(false);
  renderMapping();
  rebuildArtwork();
  if (model.image) requestAnimationFrame(fitArtboard);
}
