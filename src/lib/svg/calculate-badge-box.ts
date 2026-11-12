import type { GridBox } from './types';

/** Place the compact brand-signature box beneath the message within canvas bounds. */
export function calculateBadgeBox(messageBox: GridBox, cols: number, rows: number): GridBox {
  const badgeCols = Math.min(cols, Math.max(4, Math.round(messageBox.cols * 0.44)));
  const badgeRows = Math.min(rows, 2);
  return {
    col: Math.max(0, Math.min(cols - badgeCols, messageBox.col + messageBox.cols - badgeCols)),
    row: Math.max(0, Math.min(rows - badgeRows, messageBox.row + messageBox.rows)),
    cols: badgeCols,
    rows: badgeRows,
    lines: [],
    fontSize: 0,
    lineHeight: 0,
  };
}
