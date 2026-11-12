import { runtime } from "../state/runtime";
import { setDrawerOpen } from "../viewport/set-drawer-open";
import { leavePublicKiosk } from "../viewport/leave-public-kiosk";

/** Respect modal dismissal, then leave public previews or close the adjustment drawer. */
export function handleEscapeKey(event: KeyboardEvent): void {
  if (event.key !== "Escape" || document.querySelector("dialog[open]")) return;
  if (runtime.publicKioskMode) {
    event.preventDefault();
    leavePublicKiosk();
  } else if (document.body.classList.contains("drawer-open")) {
    setDrawerOpen(false);
  }
}
