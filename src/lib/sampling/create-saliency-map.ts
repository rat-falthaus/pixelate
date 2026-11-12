import { colorDistance } from "../color";

/** Estimate and smooth foreground likelihood from border color, local edges, and a center prior. */
export function createSaliencyMap(
  red: Float32Array,
  green: Float32Array,
  blue: Float32Array,
  brightness: Float32Array,
  cols: number,
  rows: number,
): Float32Array {
  const total = cols * rows;
  let borderRed = 0;
  let borderGreen = 0;
  let borderBlue = 0;
  let borderCount = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (row !== 0 && row !== rows - 1 && col !== 0 && col !== cols - 1) continue;
      const index = row * cols + col;
      borderRed += red[index];
      borderGreen += green[index];
      borderBlue += blue[index];
      borderCount += 1;
    }
  }

  const borderColor = {
    r: borderRed / Math.max(1, borderCount),
    g: borderGreen / Math.max(1, borderCount),
    b: borderBlue / Math.max(1, borderCount),
  };
  const rawSaliency = new Float32Array(total);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col;
      const borderDistance = Math.min(
        1,
        Math.sqrt(colorDistance({ r: red[index], g: green[index], b: blue[index] }, borderColor)) /
          210,
      );

      let edgeTotal = 0;
      let edgeCount = 0;
      if (col > 0) {
        edgeTotal += Math.abs(brightness[index] - brightness[index - 1]);
        edgeCount += 1;
      }
      if (col < cols - 1) {
        edgeTotal += Math.abs(brightness[index] - brightness[index + 1]);
        edgeCount += 1;
      }
      if (row > 0) {
        edgeTotal += Math.abs(brightness[index] - brightness[index - cols]);
        edgeCount += 1;
      }
      if (row < rows - 1) {
        edgeTotal += Math.abs(brightness[index] - brightness[index + cols]);
        edgeCount += 1;
      }
      const edgeScore = Math.min(1, edgeTotal / Math.max(1, edgeCount) / 55);

      const normalizedX = (col / Math.max(1, cols - 1)) * 2 - 1;
      const normalizedY = (row / Math.max(1, rows - 1)) * 2 - 1;
      const centerPrior = Math.max(
        0,
        1 - Math.sqrt(normalizedX ** 2 * 0.85 + (normalizedY - 0.15) ** 2 * 0.65),
      );
      const brightestChannel = Math.max(red[index], green[index], blue[index]);
      const darkestChannel = Math.min(red[index], green[index], blue[index]);
      const saturation =
        brightestChannel > 0 ? (brightestChannel - darkestChannel) / brightestChannel : 0;

      rawSaliency[index] = Math.min(
        1,
        borderDistance * 0.34 + edgeScore * 0.28 + centerPrior * 0.24 + saturation * 0.14,
      );
    }
  }

  const smoothed = new Float32Array(total);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      let totalScore = 0;
      let neighborCount = 0;
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const sampleX = col + offsetX;
          const sampleY = row + offsetY;
          if (sampleX < 0 || sampleX >= cols || sampleY < 0 || sampleY >= rows) continue;
          totalScore += rawSaliency[sampleY * cols + sampleX];
          neighborCount += 1;
        }
      }
      smoothed[row * cols + col] = totalScore / neighborCount;
    }
  }
  return smoothed;
}
