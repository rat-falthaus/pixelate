import { clusterFromRgb, colorDistance, hexToRgb, luminance, seededRandom } from './color';
import type { ColorCluster, ImageSource, PhotoCell, SampledArtwork, SamplingOptions } from './types';

const MAX_GRID_EDGE = 180;
const K_MEANS_ITERATIONS = 8;

/**
 * Samples a browser-decoded image into square cells, estimates foreground
 * saliency, applies negative-space thresholds, and quantizes visible tones.
 */
export function sampleImage(
  image: ImageSource,
  options: SamplingOptions,
): SampledArtwork {
  const sourceWidth = image instanceof HTMLImageElement ? image.naturalWidth || image.width : image.width;
  const sourceHeight = image instanceof HTMLImageElement ? image.naturalHeight || image.height : image.height;
  const tileSize = Math.max(4, options.tileSize);
  const gridScale = Math.min(1, (MAX_GRID_EDGE * tileSize) / Math.max(sourceWidth, sourceHeight));
  const cols = Math.max(1, Math.floor((sourceWidth * gridScale) / tileSize));
  const rows = Math.max(1, Math.floor((sourceHeight * gridScale) / tileSize));

  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('This browser could not create an image sampling canvas.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, cols, rows);

  const pixels = context.getImageData(0, 0, cols, rows).data;
  const total = cols * rows;
  const red = new Float32Array(total);
  const green = new Float32Array(total);
  const blue = new Float32Array(total);
  const alpha = new Uint8Array(total);
  const brightness = new Float32Array(total);

  for (let index = 0; index < total; index += 1) {
    const pixel = index * 4;
    red[index] = pixels[pixel];
    green[index] = pixels[pixel + 1];
    blue[index] = pixels[pixel + 2];
    alpha[index] = pixels[pixel + 3];
    brightness[index] = luminance({ r: red[index], g: green[index], b: blue[index] });
  }

  const saliency = createSaliencyMap(red, green, blue, brightness, cols, rows);
  const random = seededRandom(options.randomSeed);
  const minBrightness = (options.darkCutoffPercent / 100) * 255;
  const maxBrightness = (options.lightCutoffPercent / 100) * 255;
  const subjectCutoff = 1 - options.subjectThreshold / 100;
  const contrastFactor = 1 + (options.subjectContrast / 100) * 2.4;
  const cells: PhotoCell[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col;
      if (alpha[index] < 128) continue;

      const key = `${col},${row}`;
      const isSubject = options.subjectEnabled
        ? options.manualSubjectMask.get(key) ?? saliency[index] >= subjectCutoff
        : true;

      let r = red[index];
      let g = green[index];
      let b = blue[index];
      if (isSubject && options.subjectEnabled && options.subjectContrast > 0) {
        r = applyContrast(r, contrastFactor);
        g = applyContrast(g, contrastFactor);
        b = applyContrast(b, contrastFactor);
      }

      const pixelLuminance = luminance({ r, g, b });
      if (isSubject) {
        if (pixelLuminance < minBrightness || pixelLuminance > maxBrightness) continue;
      } else if (random() > options.backgroundDensity / 100) {
        continue;
      }

      cells.push({
        col,
        row,
        r: Math.round(r),
        g: Math.round(g),
        b: Math.round(b),
        luminance: pixelLuminance,
        isSubject,
        clusterIndex: 0,
      });
    }
  }

  const clusters = quantize(cells, options.colorCount);
  return { cols, rows, cells, clusters, saliency };
}

function createSaliencyMap(
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
      const borderDistance = Math.min(1, Math.sqrt(colorDistance(
        { r: red[index], g: green[index], b: blue[index] },
        borderColor,
      )) / 210);

      let edgeTotal = 0;
      let edgeCount = 0;
      if (col > 0) { edgeTotal += Math.abs(brightness[index] - brightness[index - 1]); edgeCount += 1; }
      if (col < cols - 1) { edgeTotal += Math.abs(brightness[index] - brightness[index + 1]); edgeCount += 1; }
      if (row > 0) { edgeTotal += Math.abs(brightness[index] - brightness[index - cols]); edgeCount += 1; }
      if (row < rows - 1) { edgeTotal += Math.abs(brightness[index] - brightness[index + cols]); edgeCount += 1; }
      const edgeScore = Math.min(1, (edgeTotal / Math.max(1, edgeCount)) / 55);

      const normalizedX = (col / Math.max(1, cols - 1)) * 2 - 1;
      const normalizedY = (row / Math.max(1, rows - 1)) * 2 - 1;
      const centerPrior = Math.max(
        0,
        1 - Math.sqrt(normalizedX ** 2 * 0.85 + (normalizedY - 0.15) ** 2 * 0.65),
      );
      const brightestChannel = Math.max(red[index], green[index], blue[index]);
      const darkestChannel = Math.min(red[index], green[index], blue[index]);
      const saturation = brightestChannel > 0
        ? (brightestChannel - darkestChannel) / brightestChannel
        : 0;

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

function applyContrast(value: number, factor: number): number {
  const normalized = value / 255 - 0.5;
  return Math.max(0, Math.min(255, (normalized * factor + 0.5) * 255));
}

function quantize(cells: PhotoCell[], requestedCount: number): ColorCluster[] {
  if (cells.length === 0) return [];
  const count = Math.min(Math.max(2, requestedCount), cells.length);
  const centroids: Array<{ r: number; g: number; b: number }> = [
    { r: cells[0].r, g: cells[0].g, b: cells[0].b },
  ];
  const nearestDistance = new Float64Array(cells.length).fill(Infinity);

  for (let cluster = 1; cluster < count; cluster += 1) {
    const latest = centroids[cluster - 1];
    let farthestIndex = 0;
    let farthestDistance = -1;
    for (let index = 0; index < cells.length; index += 1) {
      const distance = colorDistance(cells[index], latest);
      nearestDistance[index] = Math.min(nearestDistance[index], distance);
      if (nearestDistance[index] > farthestDistance) {
        farthestDistance = nearestDistance[index];
        farthestIndex = index;
      }
    }
    centroids.push({
      r: cells[farthestIndex].r,
      g: cells[farthestIndex].g,
      b: cells[farthestIndex].b,
    });
  }

  const assignments = new Int32Array(cells.length);
  for (let iteration = 0; iteration < K_MEANS_ITERATIONS; iteration += 1) {
    const sums = Array.from({ length: count }, () => ({ r: 0, g: 0, b: 0, count: 0 }));
    let changed = false;
    for (let index = 0; index < cells.length; index += 1) {
      let closest = 0;
      let minimumDistance = Infinity;
      for (let cluster = 0; cluster < count; cluster += 1) {
        const distance = colorDistance(cells[index], centroids[cluster]);
        if (distance < minimumDistance) {
          minimumDistance = distance;
          closest = cluster;
        }
      }
      if (assignments[index] !== closest) {
        assignments[index] = closest;
        changed = true;
      }
      sums[closest].r += cells[index].r;
      sums[closest].g += cells[index].g;
      sums[closest].b += cells[index].b;
      sums[closest].count += 1;
    }

    for (let cluster = 0; cluster < count; cluster += 1) {
      const sum = sums[cluster];
      if (!sum.count) continue;
      centroids[cluster] = {
        r: Math.round(sum.r / sum.count),
        g: Math.round(sum.g / sum.count),
        b: Math.round(sum.b / sum.count),
      };
    }
    if (!changed) break;
  }

  const sortedClustersWithIndices = centroids
    .map((centroid, oldIndex) => ({ ...clusterFromRgb(centroid), oldIndex }))
    .sort((left, right) => left.luminance - right.luminance);
  const sortedClusters: ColorCluster[] = sortedClustersWithIndices.map(({ oldIndex: _oldIndex, ...cluster }) => cluster);
  const oldToNew = new Int32Array(sortedClusters.length);
  sortedClustersWithIndices.forEach((cluster, sortedIndex) => {
    oldToNew[cluster.oldIndex] = sortedIndex;
  });
  for (let index = 0; index < cells.length; index += 1) {
    cells[index].clusterIndex = oldToNew[assignments[index]];
  }
  return sortedClusters;
}

export function mapClustersToTheme(clusters: ColorCluster[], colors: string[]): number[] {
  if (!colors.length) return clusters.map(() => 0);
  const palette = colors.map(hexToRgb);
  const used = new Set<number>();
  return clusters.map((cluster) => {
    let bestIndex = 0;
    let bestScore = Infinity;
    palette.forEach((color, index) => {
      const score = colorDistance(cluster, color) + (used.has(index) ? 4500 : 0);
      if (score < bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    used.add(bestIndex);
    return bestIndex;
  });
}
