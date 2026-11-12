import { model } from "../state/model";
import { runtime } from "../state/runtime";
import { applyWorkspaceSettings } from "../ui/apply-workspace-settings";
import { notify } from "../ui/notify";

/** Leave only the temporary kiosk preview; persisted admin kiosks require the PIN flow. */
export function leavePublicKiosk(): void {
  if (model.config.fairMode) {
    notify("Open admin settings and disable fair / kiosk mode to leave this kiosk.");
    return;
  }
  if (!runtime.publicKioskMode) return;
  runtime.publicKioskMode = false;
  applyWorkspaceSettings();
}
