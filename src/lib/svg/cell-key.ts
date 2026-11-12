/** Encode grid coordinates in the same format as manual tile and mask overrides. */
export function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}
