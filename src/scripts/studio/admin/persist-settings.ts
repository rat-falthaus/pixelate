import { saveConfig } from "../../../lib/config";
import { model } from "../state/model";
import { notify } from "../ui/notify";

/** Save the current local configuration and report browser-storage failures. */
export function persistSettings(): void {
  try {
    saveConfig(model.config);
  } catch (error) {
    notify(error instanceof Error ? error.message : "Settings could not be saved.");
  }
}
