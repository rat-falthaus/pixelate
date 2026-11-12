import type { GridBox } from './types';

/** Test whether a grid cell falls within an optional overlay rectangle. */
export function isInBox(col: number, row: number, box: GridBox | null): boolean {
  return (
    !!box &&
    col >= box.col &&
    col < box.col + box.cols &&
    row >= box.row &&
    row < box.row + box.rows
  );
}
