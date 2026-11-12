import type { MessagePosition } from '../types';
import { calculateOverlayOrigin } from './calculate-overlay-origin';
import type { GridBox } from './types';

/** Estimate text bounds in grid cells and clamp its chosen anchor or dragged origin. */
export function calculateMessageBox(
  cols: number,
  rows: number,
  tileSize: number,
  message: string,
  position: MessagePosition,
  scale: number,
  origin: { col: number; row: number } | null,
): GridBox {
  const lines = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const safeLines = lines.length ? lines : [' '];
  const baseFont = Math.max(10, Math.round(((cols * tileSize) / 14.5) * (scale / 100)));
  const longestLine = Math.max(...safeLines.map((line) => line.length));
  const estimatedWidth = longestLine * baseFont * 0.72 + tileSize * 1.3;
  const lineHeight = baseFont * 1.16;
  const estimatedHeight = safeLines.length * lineHeight + tileSize * 0.75;
  const boxCols = Math.min(cols, Math.max(4, Math.ceil(estimatedWidth / tileSize)));
  const boxRows = Math.min(rows, Math.max(2, Math.ceil(estimatedHeight / tileSize)));
  let { col, row } = calculateOverlayOrigin(cols, rows, boxCols, boxRows, position, 2);
  if (origin) {
    col = origin.col;
    row = origin.row;
  }

  return {
    col: Math.max(0, Math.min(cols - boxCols, col)),
    row: Math.max(0, Math.min(rows - boxRows, row)),
    cols: boxCols,
    rows: boxRows,
    lines: safeLines,
    fontSize: baseFont,
    lineHeight,
  };
}
