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
const { createMaskSaliency } = await import('../src/lib/recognition/create-mask-saliency.ts');
const { segmentSubjectRegions } = await import('../src/lib/recognition/segment-subject-regions.ts');
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

test('silhouette masks preserve internal holes and box corners, retrying a prompt that selected background', () => {
  const confidence = new Float32Array(49);
  for (const [col, row] of [
    [3, 1],
    [2, 2],
    [4, 2],
    [1, 3],
    [5, 3],
    [2, 4],
    [4, 4],
    [3, 5],
  ]) {
    confidence[row * 7 + col] = 1;
  }
  const region = {
    left: 1 / 7,
    top: 1 / 7,
    right: 6 / 7,
    bottom: 6 / 7,
    score: 0.9,
    label: 'object',
  };
  let calls = 0;
  const mask = segmentSubjectRegions({ width: 7, height: 7 }, [region], {
    segment(canvas, roi, callback) {
      const values = ++calls === 1 ? confidence.map((value) => 1 - value) : confidence.slice();
      callback({
        confidenceMasks: [{ width: 7, height: 7, getAsFloat32Array: () => values }],
      });
      values.fill(0);
    },
  });
  assert.equal(calls, 2);
  assert.deepEqual(mask.confidence, confidence);
  const saliency = createMaskSaliency(mask, 7, 7);
  assert.equal(saliency[3 * 7 + 3], 0, 'the hole remains background');
  assert.equal(saliency[1 * 7 + 1], 0, 'a box corner is not foreground');
  assert.equal(saliency[3 * 7 + 1], 1, 'the actual outline is foreground');
  assert.deepEqual(
    [
      ...createMaskSaliency(
        { width: 2, height: 2, confidence: new Float32Array([1, 0, 0, 0]) },
        1,
        1,
      ),
    ],
    [0.25],
  );
});

test('separate object masks are unioned without connecting their bounds; empty detections clear the mask', () => {
  let calls = 0;
  const regions = [
    { left: 0, top: 0, right: 0.4, bottom: 1, score: 0.9, label: 'object' },
    { left: 0.6, top: 0, right: 1, bottom: 1, score: 0.9, label: 'object' },
  ];
  const segmenter = {
    segment(canvas, roi, callback) {
      calls += 1;
      const confidence = new Float32Array(25);
      for (let row = 1; row < 4; row += 1) confidence[row * 5 + (roi.keypoint.x < 0.5 ? 1 : 3)] = 1;
      callback({
        confidenceMasks: [{ width: 5, height: 5, getAsFloat32Array: () => confidence }],
      });
    },
  };
  const mask = segmentSubjectRegions({ width: 5, height: 5 }, regions, segmenter);
  assert.equal(calls, 2);
  assert.equal(
    mask.confidence.reduce((sum, value) => sum + value, 0),
    6,
  );
  assert.equal(mask.confidence[2 * 5 + 2], 0, 'space between objects remains background');
  assert.deepEqual(
    [...segmentSubjectRegions({ width: 5, height: 5 }, [], segmenter).confidence],
    Array(25).fill(0),
  );
  assert.equal(calls, 2, 'empty frames do not run the segmenter');
});

test('overlapping objects are not skipped just because another silhouette covers their center', () => {
  let calls = 0;
  const region = { left: 0, top: 0, right: 1, bottom: 1, score: 0.9, label: 'object' };
  const mask = segmentSubjectRegions({ width: 5, height: 5 }, [region, region], {
    segment(canvas, roi, callback) {
      const vertical = ++calls === 1;
      const confidence = new Float32Array(25);
      for (let index = 1; index < 4; index += 1) {
        confidence[vertical ? index * 5 + 2 : 2 * 5 + index] = 1;
      }
      callback({ confidenceMasks: [{ width: 5, height: 5, getAsFloat32Array: () => confidence }] });
    },
  });
  assert.equal(calls, 2);
  assert.equal(
    mask.confidence.reduce((sum, value) => sum + value, 0),
    5,
  );
  assert.equal(mask.confidence[1 * 5 + 1], 0);
});

test('segmented subjects retain shadow/highlight details while background fill and manual masks still apply', () => {
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
      subjectMask: {
        width: 8,
        height: 4,
        confidence: Float32Array.from({ length: 32 }, (_, index) => (index % 8 < 4 ? 0.95 : 0.01)),
      },
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
        {
          ...options,
          subjectMask: { ...options.subjectMask, confidence: new Float32Array(32) },
          manualSubjectMask: new Map(),
          subjectThreshold: 100,
        },
      ).cells.length,
      0,
    );
    assert.equal(
      sampleImage({ width: 80, height: 40 }, { ...options, subjectThreshold: 100 }).cells.length,
      16,
      'maximum focus must not turn low-confidence background into foreground',
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

test('normal studio exposes live capture states and preserves the camera when settings are applied', async () => {
  const previous = {
    document: globalThis.document,
    localStorage: globalThis.localStorage,
    window: globalThis.window,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
  };
  const nodes = new Map();
  const makeElement = () => {
    const classes = new Set();
    return {
      style: {},
      classList: {
        add: (...names) => names.forEach((name) => classes.add(name)),
        remove: (...names) => names.forEach((name) => classes.delete(name)),
        contains: (name) => classes.has(name),
        toggle(name, force) {
          const enabled = force ?? !classes.has(name);
          if (enabled) classes.add(name);
          else classes.delete(name);
          return enabled;
        },
      },
      setAttribute() {},
      removeAttribute() {},
      replaceChildren() {},
      append() {},
      addEventListener() {},
    };
  };
  let fullscreenExits = 0;
  let fullscreenRequests = 0;
  globalThis.document = {
    body: makeElement(),
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, makeElement());
      return nodes.get(id);
    },
    createElement: makeElement,
    querySelector: () => null,
    querySelectorAll: () => [],
    fullscreenElement: {},
    documentElement: {
      async requestFullscreen() {
        fullscreenRequests += 1;
        document.fullscreenElement = {};
      },
    },
    async exitFullscreen() {
      fullscreenExits += 1;
      this.fullscreenElement = null;
    },
  };
  globalThis.localStorage = { getItem: () => null };
  globalThis.window = { clearTimeout() {}, clearInterval() {}, setTimeout: () => 0 };
  globalThis.requestAnimationFrame = () => 0;
  globalThis.cancelAnimationFrame = () => {};
  try {
    const { model } = await import('../src/scripts/studio/state/model.ts');
    const { runtime } = await import('../src/scripts/studio/state/runtime.ts');
    const { updateLiveUi } = await import('../src/scripts/studio/ui/update-live-ui.ts');
    const { applyWorkspaceSettings } =
      await import('../src/scripts/studio/ui/apply-workspace-settings.ts');
    const savedModel = { ...model };
    const savedRuntime = { ...runtime };
    try {
      model.config = { ...model.config, fairMode: false };
      updateLiveUi();
      assert.equal(nodes.get('studio-live-camera').textContent, 'Start live camera');
      assert.ok(nodes.get('studio-stop-live').classList.contains('is-hidden'));

      let stopped = 0;
      model.liveCameraActive = true;
      runtime.liveCameraStream = { getTracks: () => [{ stop: () => stopped++ }] };
      document.body.classList.add('fair-mode');
      applyWorkspaceSettings();
      assert.equal(model.liveCameraActive, true);
      assert.equal(stopped, 0);
      assert.equal(
        fullscreenExits,
        1,
        'leaving fair mode exits its fullscreen without stopping video',
      );
      assert.equal(nodes.get('studio-live-camera').textContent, 'Snap & freeze');
      assert.equal(nodes.get('studio-stop-live').classList.contains('is-hidden'), false);
      assert.equal(
        nodes.get('compare-photo').disabled,
        true,
        'do not compare live video with a stale still',
      );

      document.fullscreenElement = {};
      applyWorkspaceSettings();
      assert.equal(
        fullscreenExits,
        1,
        'normal settings preserve independently requested fullscreen',
      );
      assert.equal(model.liveCameraActive, true);
      assert.equal(fullscreenRequests, 0);

      document.fullscreenElement = null;
      model.config.fairMode = true;
      applyWorkspaceSettings();
      assert.equal(fullscreenRequests, 1, 'entering fair mode can expand the existing live stream');
      assert.equal(model.liveCameraActive, true);
      assert.equal(stopped, 0);

      model.liveCameraActive = false;
      runtime.liveCameraStarting = true;
      updateLiveUi();
      assert.equal(nodes.get('studio-live-camera').disabled, true);
      assert.equal(nodes.get('studio-stop-live').classList.contains('is-hidden'), false);
    } finally {
      Object.assign(model, savedModel);
      Object.assign(runtime, savedRuntime);
    }
  } finally {
    Object.assign(globalThis, previous);
  }
});
