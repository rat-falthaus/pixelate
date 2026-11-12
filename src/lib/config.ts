/** Public config API; implementations live in single-function modules. */
export { cloneDefaultConfig } from "./config/clone-default-config";
export { getActiveTheme } from "./config/get-active-theme";
export { isPositionLocked } from "./config/is-position-locked";
export { loadConfig } from "./config/load-config";
export { normalizeConfig } from "./config/normalize-config";
export { saveConfig } from "./config/save-config";
export { DEFAULT_CONFIG, DEFAULT_PERMISSIONS, DEFAULT_THEME, STORAGE_KEY } from "./config/state";
