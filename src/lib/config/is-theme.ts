import type { BrandTheme } from "../types";

/** Narrow an unknown saved value to a structurally valid palette. */
export function isTheme(value: unknown): value is BrandTheme {
  if (!value || typeof value !== "object") return false;
  const theme = value as Partial<BrandTheme>;
  return (
    typeof theme.id === "string" &&
    typeof theme.name === "string" &&
    Array.isArray(theme.colors) &&
    theme.colors.length >= 2 &&
    theme.colors.every((color) => typeof color === "string" && /^#[\da-f]{6}$/i.test(color))
  );
}
