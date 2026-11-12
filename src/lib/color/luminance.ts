import type { RGB } from "./types";

/** Calculate weighted RGB brightness on the 0-255 scale. */
export function luminance({ r, g, b }: RGB): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
