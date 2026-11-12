import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (
        ['ERR_MODULE_NOT_FOUND', 'ERR_UNSUPPORTED_DIR_IMPORT'].includes(error.code) &&
        specifier.startsWith('.') &&
        !/\.[a-z]+$/i.test(specifier)
      ) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw error;
    }
  },
});

const { normalizeDetectionRegion } =
  await import('../src/lib/recognition/normalize-detection-region.ts');
const { createRegionSaliency } = await import('../src/lib/recognition/create-region-saliency.ts');
const { sampleImage } = await import('../src/lib/sampling/sample-image.ts');
const { createArtworkSvg } = await import('../src/lib/svg/create-artwork-svg.ts');
const { normalizeConfig } = await import('../src/lib/config/normalize-config.ts');

test('detections stay aligned when their input is a scaled, already mirrored/cropped canvas', () => {
  const region = normalizeDetectionRegion(
    { originX: 320, originY: -32, width: 400, height: 192, angle: 0 },
    640,
    320,
    0.9,
    'person',
  );
  assert.deepEqual(region, {
    left: 0.5,
    top: 0,
    right: 1,
    bottom: 0.5,
    score: 0.9,
    label: 'person',
  });
  assert.deepEqual(
    [...createRegionSaliency([region], 4, 2)].map((value) => Math.round(value * 10)),
    [0, 0, 9, 9, 0, 0, 0, 0],
  );
  assert.deepEqual([...createRegionSaliency([], 4, 2)], Array(8).fill(0));
  assert.equal(
    normalizeDetectionRegion(
      { originX: 800, originY: 0, width: 10, height: 10 },
      640,
      320,
      1,
      'face',
    ),
    null,
  );
});

test('detected subjects retain shadow/highlight details while background fill and manual masks still apply', () => {
  const previousDocument = globalThis.document;
  const previousImage = globalThis.HTMLImageElement;
  globalThis.HTMLImageElement = class {};
  globalThis.document = {
    createElement() {
      const canvas = {
        width: 0,
        height: 0,
        getContext() {
          return {
            drawImage() {},
            getImageData() {
              const pixels = new Uint8ClampedArray(canvas.width * canvas.height * 4);
              for (let index = 0; index < canvas.width * canvas.height; index += 1) {
                pixels.set(
                  [index % 2 ? 255 : 0, index % 2 ? 255 : 0, index % 2 ? 255 : 0, 255],
                  index * 4,
                );
              }
              return { data: pixels };
            },
          };
        },
      };
      return canvas;
    },
  };
  try {
    const options = {
      tileSize: 10,
      subjectEnabled: true,
      subjectThreshold: 52,
      subjectContrast: 78,
      backgroundDensity: 0,
      darkCutoffPercent: 20,
      lightCutoffPercent: 95,
      colorCount: 2,
      randomSeed: 4219,
      manualSubjectMask: new Map([
        ['0,0', false],
        ['7,3', true],
      ]),
      subjectRegions: [{ left: 0, top: 0, right: 0.5, bottom: 1, score: 0.95, label: 'person' }],
    };
    const sampled = sampleImage({ width: 80, height: 40 }, options);
    assert.equal(sampled.cells.length, 16);
    assert.ok(sampled.cells.every((cell) => cell.isSubject));
    assert.ok(sampled.cells.some((cell) => cell.r === 0));
    assert.ok(sampled.cells.some((cell) => cell.r === 255));
    assert.ok(sampled.cells.some((cell) => cell.col === 7 && cell.row === 3));
    assert.ok(!sampled.cells.some((cell) => cell.col === 0 && cell.row === 0));
    assert.equal(
      sampleImage(
        { width: 80, height: 40 },
        { ...options, subjectRegions: [], manualSubjectMask: new Map() },
      ).cells.length,
      0,
    );
  } finally {
    globalThis.document = previousDocument;
    globalThis.HTMLImageElement = previousImage;
  }
});

test('uploaded logo replaces the text identity, and text fallback works without a message', () => {
  const options = {
    grid: { cols: 40, rows: 30, cells: [], clusters: [], saliency: new Float32Array() },
    tileSize: 18,
    theme: { id: 'test', name: 'Test', colors: ['#FFFFFF'] },
    enforceTheme: true,
    clusterToTheme: [],
    manualTileOverrides: new Map(),
    background: 'black',
    includeBackground: true,
    hairlines: false,
    backgroundScatter: 0,
    randomSeed: 1,
    messageEnabled: false,
    message: '',
    messagePosition: 'upper',
    messageOrigin: null,
    messageScale: 100,
    brandSignature: 'Test & Brand',
    showBadge: true,
    logoDataUrl: null,
    logoAspectRatio: 2,
    logoPosition: 'lower',
    logoOrigin: null,
    fontFamily: 'Arial',
    fontDataUri: null,
  };
  const fallback = createArtworkSvg(options).markup;
  assert.match(fallback, /id="brand-signature" data-draggable="logo"/);
  assert.match(fallback, /<text[^>]+>Test &amp; Brand<\/text>/);
  const uploaded = createArtworkSvg({
    ...options,
    logoDataUrl: 'data:image/png;base64,test',
  }).markup;
  assert.match(uploaded, /<image data-draggable="logo"/);
  assert.doesNotMatch(uploaded, /id="brand-signature"|<text/);
  assert.doesNotMatch(
    createArtworkSvg({ ...options, logoDataUrl: 'data:image/png;base64,test', showBadge: false })
      .markup,
    /data-draggable="logo"/,
  );
});

test('camera selection survives normalization and older configurations default to automatic', () => {
  assert.equal(
    normalizeConfig({ cameraDeviceId: 'external-camera' }).cameraDeviceId,
    'external-camera',
  );
  assert.equal(normalizeConfig({ cameraDeviceId: 123 }).cameraDeviceId, '');
  assert.equal(normalizeConfig({}).cameraDeviceId, '');
});

test('free-palette background scatter preserves subject colors', () => {
  const options = {
    grid: {
      cols: 40,
      rows: 30,
      saliency: new Float32Array(),
      cells: Array.from({ length: 20 }, (_, col) => ({
        col,
        row: 0,
        isSubject: col === 0,
        clusterIndex: 0,
      })),
      clusters: [{ hex: '#111111' }, { hex: '#EEEEEE' }],
    },
    tileSize: 18,
    theme: { colors: ['#FFFFFF'] },
    enforceTheme: false,
    clusterToTheme: [],
    manualTileOverrides: new Map(),
    background: 'transparent',
    includeBackground: false,
    hairlines: false,
    randomSeed: 1,
    messageEnabled: false,
    message: '',
    messagePosition: 'upper',
    messageOrigin: null,
    messageScale: 100,
    brandSignature: '',
    showBadge: false,
    logoDataUrl: null,
    logoAspectRatio: 1,
    logoPosition: 'lower',
    logoOrigin: null,
    fontFamily: 'Arial',
    fontDataUri: null,
  };
  assert.equal(createArtworkSvg({ ...options, backgroundScatter: 0 }).pathCount, 1);
  const scattered = createArtworkSvg({ ...options, backgroundScatter: 100 });
  assert.equal(scattered.pathCount, 2);
  assert.equal(scattered.tileCount, 20);
  assert.match(scattered.markup, /fill="#111111" d="M0 0h18v18h-18Z/);
});
