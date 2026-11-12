import type { StudioConfig } from "../types";
import { STORAGE_KEY } from "./state";

/** Persist settings to localStorage and surface quota or permission failures. */
export function saveConfig(config: StudioConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error("Unable to save studio settings in this browser.", error);
    throw new Error("Settings could not be saved. Check available browser storage.");
  }
}
