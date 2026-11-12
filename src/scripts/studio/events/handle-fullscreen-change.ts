import { model } from "../state/model";
import { runtime } from "../state/runtime";
import { notify } from "../ui/notify";
import { updateFullscreenUi } from "../ui/update-fullscreen-ui";
import { leavePublicKiosk } from "../viewport/leave-public-kiosk";

/** Browser Escape leaves public previews but never clears the persisted admin kiosk lock. */
export function handleFullscreenChange(): void {
  if (!document.fullscreenElement && runtime.publicKioskMode && !model.config.fairMode) {
    leavePublicKiosk();
  }
  updateFullscreenUi();
  if (!document.fullscreenElement && model.config.fairMode) {
    notify(
      "Fullscreen exited. Kiosk mode is still admin-locked; enter fullscreen again or open admin settings.",
    );
  }
}
