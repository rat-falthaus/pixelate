import { model } from "./model";
import { runtime } from "./runtime";

/** Combine persisted admin kiosk mode with the temporary public preview. */
export function isKioskMode(): boolean {
  return model.config.fairMode || runtime.publicKioskMode;
}
