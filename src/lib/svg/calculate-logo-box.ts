import type { MessagePosition } from "../types";
import { calculateOverlayOrigin } from "./calculate-overlay-origin";
import type { GridBox } from "./types";

/** Size a logo by grid width and aspect ratio, then constrain its placement to the canvas. */
export function calculateLogoBox(
  cols: number,
  rows: number,
  position: MessagePosition,
  origin: { col: number; row: number } | null,
  aspectRatio: number,
): GridBox {
  const logoCols = Math.min(cols, Math.max(2, Math.floor(cols * 0.18)));
  const logoRows = Math.min(rows, Math.max(2, Math.ceil(logoCols / Math.max(0.1, aspectRatio))));
  const anchor = calculateOverlayOrigin(cols, rows, logoCols, logoRows, position, 2);
  return {
    col: origin ? Math.max(0, Math.min(cols - logoCols, origin.col)) : anchor.col,
    row: origin ? Math.max(0, Math.min(rows - logoRows, origin.row)) : anchor.row,
    cols: logoCols,
    rows: logoRows,
    lines: [],
    fontSize: 0,
    lineHeight: 0,
  };
}
