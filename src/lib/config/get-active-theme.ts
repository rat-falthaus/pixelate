import type { BrandTheme, StudioConfig } from "../types";

/** Resolve the configured palette, falling back to the first available theme. */
export function getActiveTheme(config: StudioConfig): BrandTheme {
  return config.themes.find((theme) => theme.id === config.activeThemeId) ?? config.themes[0];
}
