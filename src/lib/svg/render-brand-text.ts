import { escapeXml } from "../color";
import type { BackgroundMode } from "../types";
import type { GridBox } from "./types";

/** Render the no-upload brand identity at the same grid position and lock target as a logo. */
export function renderBrandText(
  box: GridBox,
  tileSize: number,
  text: string,
  background: BackgroundMode,
  fontFamily: string,
): string {
  const x = box.col * tileSize;
  const y = box.row * tileSize;
  const width = box.cols * tileSize;
  const height = box.rows * tileSize;
  const color = background === "white" ? "#080A09" : "#FFFFFF";
  const backing =
    background === "transparent"
      ? ""
      : `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${background === "white" ? "#FFFFFF" : "#080A09"}"/>`;
  const size = Math.min(height * 0.55, width / Math.max(1, text.length * 0.65));
  return `<g id="brand-signature" data-draggable="logo">${backing}<text x="${x + width / 2}" y="${y + height / 2}" dominant-baseline="middle" text-anchor="middle" fill="${color}" font-family="${escapeXml(fontFamily)}" font-size="${size}" font-weight="800">${escapeXml(text)}</text></g>`;
}
