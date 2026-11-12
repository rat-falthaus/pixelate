import type { MessagePosition } from '../types';

/** Resolve a named overlay anchor to a clamped grid origin. */
export function calculateOverlayOrigin(
  cols: number,
  rows: number,
  boxCols: number,
  boxRows: number,
  position: MessagePosition,
  margin: number,
): { col: number; row: number } {
  const isLeft = position === 'topleft' || position === 'bottomleft' || position === 'middleleft';
  const isRight =
    position === 'topright' || position === 'bottomright' || position === 'middleright';
  const isTop = position === 'upper' || position === 'topleft' || position === 'topright';
  const isBottom = position === 'lower' || position === 'bottomleft' || position === 'bottomright';
  const col = isLeft
    ? margin
    : isRight
      ? cols - boxCols - margin
      : Math.floor((cols - boxCols) / 2);
  const row = isTop
    ? Math.max(margin, Math.floor(rows * 0.18))
    : isBottom
      ? rows - boxRows - margin
      : Math.floor((rows - boxRows) / 2);
  return {
    col: Math.max(0, Math.min(cols - boxCols, col)),
    row: Math.max(0, Math.min(rows - boxRows, row)),
  };
}
