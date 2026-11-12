/** Clamp RGB channels to bytes and encode an uppercase hexadecimal color. */
export function rgbToHex(r: number, g: number, b: number): string {
  const byte = (value: number) =>
    Math.round(Math.max(0, Math.min(255, value)))
      .toString(16)
      .padStart(2, "0");
  return `#${byte(r)}${byte(g)}${byte(b)}`.toUpperCase();
}
