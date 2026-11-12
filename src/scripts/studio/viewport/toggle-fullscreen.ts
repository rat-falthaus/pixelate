import { notify } from "../ui/notify";
import { updateFullscreenUi } from "../ui/update-fullscreen-ui";
import { model } from "../state/model";
import { openAdminGate } from "../admin/open-admin-gate";

/** Toggle fullscreen directly from the studio without changing mode or requiring admin access. */
export async function toggleFullscreen(): Promise<void> {
  const entering = !document.fullscreenElement;
  if (!entering && model.config.fairMode) {
    notify("Use admin settings to leave an admin-started kiosk.");
    openAdminGate();
    return;
  }
  try {
    if (entering) {
      if (!document.documentElement.requestFullscreen) {
        notify("Fullscreen is unavailable in this browser.");
        return;
      }
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (error) {
    console.error("Could not change fullscreen mode.", error);
    notify(
      entering
        ? "Could not enter fullscreen. Your browser may restrict this feature."
        : "Could not exit fullscreen. Press Escape to leave.",
    );
  } finally {
    updateFullscreenUi();
  }
}
