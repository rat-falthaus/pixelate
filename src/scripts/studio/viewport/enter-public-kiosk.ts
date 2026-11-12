import { requestLiveFullscreen } from "../camera/request-live-fullscreen";
import { model } from "../state/model";
import { runtime } from "../state/runtime";
import { applyWorkspaceSettings } from "../ui/apply-workspace-settings";
import { notify } from "../ui/notify";

/** Preview kiosk mode without persisting settings or acquiring an admin lock. */
export async function enterPublicKiosk(): Promise<void> {
  if (model.config.fairMode) {
    notify("This kiosk was enabled by an administrator. Use admin settings to leave.");
    return;
  }
  runtime.publicKioskMode = true;
  applyWorkspaceSettings();
  const entered = await requestLiveFullscreen();
  if (!entered && runtime.publicKioskMode) {
    notify("Kiosk preview is active. Fullscreen is unavailable; use Leave kiosk mode or Escape.");
  }
}
