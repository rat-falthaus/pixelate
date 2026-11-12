import { luminance, seededRandom } from '../color';
import type { ImageSource, PhotoCell, SampledArtwork, SamplingOptions } from '../types';
import { applyContrast } from './apply-contrast';
import { createSaliencyMap } from './create-saliency-map';
import { quantize } from './quantize';
import { MAX_GRID_EDGE } from './state';
import { createMaskSaliency } from '../recognition/create-mask-saliency';

/**
 * Samples a browser-decoded image into square cells, estimates foreground
 * saliency, applies negative-space thresholds, and quantizes visible tones.
 */
export function sampleImage(image: ImageSource, options: SamplingOptions): SampledArtwork {
  const sourceWidth =
    image instanceof HTMLImageElement ? image.naturalWidth || image.width : image.width;
  const sourceHeight =
    image instanceof HTMLImageElement ? image.naturalHeight || image.height : image.height;
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

  const recognized = options.subjectMask !== null;
  const saliency =
    options.subjectMask === null
      ? createSaliencyMap(red, green, blue, brightness, cols, rows)
      : createMaskSaliency(options.subjectMask, cols, rows);
  const random = seededRandom(options.randomSeed);
  const minBrightness = (options.darkCutoffPercent / 100) * 255;
  const maxBrightness = (options.lightCutoffPercent / 100) * 255;
  // Even maximum focus must reject low-confidence background probabilities.
  const subjectCutoff = recognized
    ? 0.8 - options.subjectThreshold * 0.006
    : 1 - options.subjectThreshold / 100;
  const contrastFactor = 1 + (options.subjectContrast / 100) * (recognized ? 0.6 : 2.4);
  const cells: PhotoCell[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col;
      if (alpha[index] < 128) continue;

      const key = `${col},${row}`;
      const isSubject = options.subjectEnabled
        ? (options.manualSubjectMask.get(key) ?? saliency[index] >= subjectCutoff)
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
        if (!recognized && (pixelLuminance < minBrightness || pixelLuminance > maxBrightness))
          continue;
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
