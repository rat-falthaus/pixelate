import { escapeXml } from '../color';
import type { GridBox } from './types';

/** Render a prepared logo data URI within its grid-aligned SVG image bounds. */
export function renderLogo(box: GridBox, tileSize: number, dataUrl: string): string {
  return `<image data-draggable="logo" x="${box.col * tileSize}" y="${box.row * tileSize}" width="${box.cols * tileSize}" height="${box.rows * tileSize}" href="${escapeXml(dataUrl)}" preserveAspectRatio="xMidYMid meet"/>`;
}
