import type { SubjectMask } from "./types";

/** Sample silhouette confidence at tile centers without filling boxes, holes, or disconnected gaps. */
export function createMaskSaliency(mask: SubjectMask, cols: number, rows: number): Float32Array {
  const saliency = new Float32Array(cols * rows);
  for (let row = 0; row < rows; row += 1) {
    const y = Math.max(0, Math.min(mask.height - 1, ((row + 0.5) * mask.height) / rows - 0.5));
    const top = Math.floor(y);
    const bottom = Math.min(mask.height - 1, top + 1);
    for (let col = 0; col < cols; col += 1) {
      const x = Math.max(0, Math.min(mask.width - 1, ((col + 0.5) * mask.width) / cols - 0.5));
      const left = Math.floor(x);
      const right = Math.min(mask.width - 1, left + 1);
      const upper =
        mask.confidence[top * mask.width + left] * (1 - (x - left)) +
        mask.confidence[top * mask.width + right] * (x - left);
      const lower =
        mask.confidence[bottom * mask.width + left] * (1 - (x - left)) +
        mask.confidence[bottom * mask.width + right] * (x - left);
      saliency[row * cols + col] = upper * (1 - (y - top)) + lower * (y - top);
    }
  }
  return saliency;
}
