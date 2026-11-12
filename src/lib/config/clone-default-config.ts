import type { StudioConfig } from "../types";
import { DEFAULT_CONFIG } from "./state";

/** Return an independent copy of the bundled settings and palettes. */
export function cloneDefaultConfig(): StudioConfig {
  return structuredClone(DEFAULT_CONFIG);
}
