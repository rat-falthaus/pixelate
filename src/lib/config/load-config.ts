import type { StudioConfig } from "../types";
import { cloneDefaultConfig } from "./clone-default-config";
import { normalizeConfig } from "./normalize-config";
import { STORAGE_KEY } from "./state";

/** Restore local settings, logging malformed or unavailable storage before using defaults. */
export function loadConfig(): StudioConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeConfig(JSON.parse(raw)) : cloneDefaultConfig();
  } catch (error) {
    console.warn("Saved studio settings could not be read; using the bundled defaults.", error);
    return cloneDefaultConfig();
  }
}
