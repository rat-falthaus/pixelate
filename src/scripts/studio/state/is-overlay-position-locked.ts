import { isPositionLocked } from "../../../lib/config";
import { isKioskMode } from "./is-kiosk-mode";
import { model } from "./model";

/** Apply the same overlay permissions in public previews and admin kiosks. */
export function isOverlayPositionLocked(overlay: "message" | "logo"): boolean {
  return isPositionLocked({ ...model.config, fairMode: isKioskMode() }, overlay);
}
