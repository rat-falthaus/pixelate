import type { RGB } from "./types";

/** Decode a hexadecimal color into red, green, and blue channels. */
export function hexToRgb(hex: string): RGB {
  const value = hex.replace("#", "");
  const parsed = Number.parseInt(value, 16);
  return { r: (parsed >> 16) & 255, g: (parsed >> 8) & 255, b: parsed & 255 };
}
