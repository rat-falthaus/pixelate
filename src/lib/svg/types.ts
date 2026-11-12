export interface GridBox {
  col: number;
  row: number;
  cols: number;
  rows: number;
  lines: string[];
  fontSize: number;
  lineHeight: number;
}

export interface SvgResult {
  markup: string;
  tileCount: number;
  pathCount: number;
  byteCount: number;
}
