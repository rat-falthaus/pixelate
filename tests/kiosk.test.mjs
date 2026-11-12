import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (
        ["ERR_MODULE_NOT_FOUND", "ERR_UNSUPPORTED_DIR_IMPORT"].includes(error.code) &&
        specifier.startsWith(".") &&
        !/\.[a-z]+$/i.test(specifier)
      ) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw error;
    }
  },
});

const { normalizeDetectionRegion } =
  await import("../src/lib/recognition/normalize-detection-region.ts");
const { createMaskSaliency } = await import("../src/lib/recognition/create-mask-saliency.ts");
const { segmentSubjectRegions } = await import("../src/lib/recognition/segment-subject-regions.ts");
const { sampleImage } = await import("../src/lib/sampling/sample-image.ts");
const { createArtworkSvg } = await import("../src/lib/svg/create-artwork-svg.ts");
const { normalizeConfig } = await import("../src/lib/config/normalize-config.ts");
const { isOpenPalm } = await import("../src/lib/gesture/is-open-palm.ts");

const openPalm = [
  [0, 0],
  [-0.3, 0.2],
  [-0.55, 0.45],
  [-0.85, 0.65],
  [-1.15, 0.85],
  [-0.42, 1],
  [-0.45, 1.6],
  [-0.47, 1.95],
  [-0.48, 2.25],
  [0, 1.05],
  [0, 1.8],
  [0, 2.15],
  [0, 2.5],
  [0.38, 0.95],
  [0.42, 1.65],
  [0.45, 2],
  [0.47, 2.27],
  [0.65, 0.78],
  [0.8, 1.25],
  [0.85, 1.52],
  [0.88, 1.75],
].map(([x, y]) => ({ x: 0.5 + x * 0.1, y: 0.8 - y * 0.1 }));

test("open palms work at different sizes and rotations without accepting folded fingers", () => {
  for (const scale of [0.2, 0.6, 1.5]) {
    for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      for (const mirror of [-1, 1]) {
        const hand = openPalm.map(({ x, y }) => {
          const dx = (x - 0.5) * scale;
          const dy = (y - 0.8) * scale;
          return {
            x: 0.5 + mirror * (dx * Math.cos(angle) - dy * Math.sin(angle)),
            y: 0.5 + dx * Math.sin(angle) + dy * Math.cos(angle),
          };
        });
        assert.ok(isOpenPalm(hand), `scale=${scale}, angle=${angle}, mirror=${mirror}`);
      }
    }
  }
  const foldedFinger = openPalm.map((point) => ({ ...point }));
  foldedFinger[8] = { ...foldedFinger[5] };
  assert.equal(isOpenPalm(foldedFinger), false);
  const foldedThumb = openPalm.map((point) => ({ ...point }));
  foldedThumb[4] = { ...foldedThumb[2] };
  assert.equal(isOpenPalm(foldedThumb), false);
  assert.equal(isOpenPalm(Array.from({ length: 21 }, () => ({ x: 0, y: 0 }))), false);
});

test("detections stay aligned when their input is a scaled, already mirrored/cropped canvas", () => {
  const region = normalizeDetectionRegion(
    { originX: 320, originY: -32, width: 400, height: 192, angle: 0 },
    640,
    320,
    0.9,
    "person",
  );
  assert.deepEqual(region, {
    left: 0.5,
    top: 0,
    right: 1,
    bottom: 0.5,
    score: 0.9,
    label: "person",
  });
  assert.equal(
    normalizeDetectionRegion(
      { originX: 800, originY: 0, width: 10, height: 10 },
      640,
      320,
      1,
      "face",
    ),
    null,
  );
});

test("silhouette masks preserve internal holes and box corners, retrying a prompt that selected background", () => {
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
    label: "object",
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
  assert.equal(saliency[3 * 7 + 3], 0, "the hole remains background");
  assert.equal(saliency[1 * 7 + 1], 0, "a box corner is not foreground");
  assert.equal(saliency[3 * 7 + 1], 1, "the actual outline is foreground");
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

test("separate object masks are unioned without connecting their bounds; empty detections clear the mask", () => {
  let calls = 0;
  const regions = [
    { left: 0, top: 0, right: 0.4, bottom: 1, score: 0.9, label: "object" },
    { left: 0.6, top: 0, right: 1, bottom: 1, score: 0.9, label: "object" },
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
  assert.equal(mask.confidence[2 * 5 + 2], 0, "space between objects remains background");
  assert.deepEqual(
    [...segmentSubjectRegions({ width: 5, height: 5 }, [], segmenter).confidence],
    Array(25).fill(0),
  );
  assert.equal(calls, 2, "empty frames do not run the segmenter");
});

test("overlapping objects are not skipped just because another silhouette covers their center", () => {
  let calls = 0;
  const region = { left: 0, top: 0, right: 1, bottom: 1, score: 0.9, label: "object" };
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

test("segmented subjects retain shadow/highlight details while background fill and manual masks still apply", () => {
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
        ["0,0", false],
        ["7,3", true],
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
      "maximum focus must not turn low-confidence background into foreground",
    );
  } finally {
    globalThis.document = previousDocument;
    globalThis.HTMLImageElement = previousImage;
  }
});

test("uploaded logo replaces the text identity, and text fallback works without a message", () => {
  const options = {
    grid: { cols: 40, rows: 30, cells: [], clusters: [], saliency: new Float32Array() },
    tileSize: 18,
    theme: { id: "test", name: "Test", colors: ["#FFFFFF"] },
    enforceTheme: true,
    clusterToTheme: [],
    manualTileOverrides: new Map(),
    background: "black",
    includeBackground: true,
    tileSpacingPercent: 0,
    backgroundScatter: 0,
    randomSeed: 1,
    messageEnabled: false,
    message: "",
    messagePosition: "upper",
    messageOrigin: null,
    messageScale: 100,
    brandSignature: "Test & Brand",
    showBadge: true,
    logoDataUrl: null,
    logoAspectRatio: 2,
    logoPosition: "lower",
    logoOrigin: null,
    fontFamily: "Arial",
    fontDataUri: null,
  };
  const fallback = createArtworkSvg(options).markup;
  assert.match(fallback, /id="brand-signature" data-draggable="logo"/);
  assert.match(fallback, /<text[^>]+>Test &amp; Brand<\/text>/);
  const uploaded = createArtworkSvg({
    ...options,
    logoDataUrl: "data:image/png;base64,test",
  }).markup;
  assert.match(uploaded, /<image data-draggable="logo"/);
  assert.doesNotMatch(uploaded, /id="brand-signature"|<text/);
  assert.doesNotMatch(
    createArtworkSvg({ ...options, logoDataUrl: "data:image/png;base64,test", showBadge: false })
      .markup,
    /data-draggable="logo"/,
  );
});

test("camera selection survives normalization and older configurations default to automatic", () => {
  assert.equal(
    normalizeConfig({ cameraDeviceId: "external-camera" }).cameraDeviceId,
    "external-camera",
  );
  assert.equal(normalizeConfig({ cameraDeviceId: 123 }).cameraDeviceId, "");
  assert.equal(normalizeConfig({}).cameraDeviceId, "");
});

test("tile spacing migrates legacy hairlines and keeps saved percentages within bounds", () => {
  assert.equal(normalizeConfig({ hairlines: false }).tileSpacingPercent, 0);
  assert.equal(normalizeConfig({ hairlines: true }).tileSpacingPercent, 5);
  assert.equal(normalizeConfig({ hairlines: true, tileSpacingPercent: 0 }).tileSpacingPercent, 0);
  assert.equal(normalizeConfig({ tileSpacingPercent: 30 }).tileSpacingPercent, 30);
  assert.equal(normalizeConfig({ tileSpacingPercent: -10 }).tileSpacingPercent, 0);
  assert.equal(normalizeConfig({ tileSpacingPercent: 100 }).tileSpacingPercent, 50);
  assert.equal(normalizeConfig({ tileSpacingPercent: NaN }).tileSpacingPercent, 5);
});

test("spacing renders proportional gutters and zero-gap edges for sampled and painted tiles", () => {
  const options = {
    grid: {
      cols: 3,
      rows: 1,
      cells: [0, 1].map((col) => ({ col, row: 0, isSubject: true, clusterIndex: 0 })),
      clusters: [{ hex: "#FFFFFF" }],
      saliency: new Float32Array(),
    },
    tileSize: 20,
    tileSpacingPercent: 0,
    theme: { id: "test", name: "Test", colors: ["#FFFFFF"] },
    enforceTheme: true,
    clusterToTheme: [0],
    manualTileOverrides: new Map([["2,0", "#FFFFFF"]]),
    background: "transparent",
    includeBackground: false,
    backgroundScatter: 0,
    randomSeed: 1,
    messageEnabled: false,
    message: "",
    messagePosition: "upper",
    messageOrigin: null,
    messageScale: 100,
    brandSignature: "",
    showBadge: false,
    logoDataUrl: null,
    logoAspectRatio: 1,
    logoPosition: "lower",
    logoOrigin: null,
    fontFamily: "Arial",
    fontDataUri: null,
  };
  const joined = createArtworkSvg(options);
  assert.equal(joined.tileCount, 3);
  assert.match(joined.markup, /d="M0 0h20v20h-20ZM20 0h20v20h-20ZM40 0h20v20h-20Z"/);
  assert.match(joined.markup, /shape-rendering="crispEdges"/);
  const spaced = createArtworkSvg({ ...options, tileSpacingPercent: 20 });
  assert.equal(spaced.tileCount, 3);
  assert.match(spaced.markup, /d="M2 2h16v16h-16ZM22 2h16v16h-16ZM42 2h16v16h-16Z"/);
  assert.match(
    createArtworkSvg({ ...options, tileSize: 4, tileSpacingPercent: 50 }).markup,
    /d="M1 1h2v2h-2ZM5 1h2v2h-2ZM9 1h2v2h-2Z"/,
  );
});

test("free-palette background scatter preserves subject colors", () => {
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
      clusters: [{ hex: "#111111" }, { hex: "#EEEEEE" }],
    },
    tileSize: 18,
    theme: { colors: ["#FFFFFF"] },
    enforceTheme: false,
    clusterToTheme: [],
    manualTileOverrides: new Map(),
    background: "transparent",
    includeBackground: false,
    tileSpacingPercent: 0,
    randomSeed: 1,
    messageEnabled: false,
    message: "",
    messagePosition: "upper",
    messageOrigin: null,
    messageScale: 100,
    brandSignature: "",
    showBadge: false,
    logoDataUrl: null,
    logoAspectRatio: 1,
    logoPosition: "lower",
    logoOrigin: null,
    fontFamily: "Arial",
    fontDataUri: null,
  };
  assert.equal(createArtworkSvg({ ...options, backgroundScatter: 0 }).pathCount, 1);
  const scattered = createArtworkSvg({ ...options, backgroundScatter: 100 });
  assert.equal(scattered.pathCount, 2);
  assert.equal(scattered.tileCount, 20);
  assert.match(scattered.markup, /fill="#111111" d="M0 0h18v18h-18Z/);
});

test("studio preserves positioning permissions, camera lifecycle, and gesture countdown state", async (t) => {
  const previous = {
    document: globalThis.document,
    localStorage: globalThis.localStorage,
    window: globalThis.window,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
    HTMLMediaElement: globalThis.HTMLMediaElement,
  };
  const nodes = new Map();
  const documentListeners = new Map();
  const makeElement = () => {
    const classes = new Set();
    return {
      style: {},
      dataset: {},
      attributes: new Map(),
      listeners: new Map(),
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
      setAttribute(name, value) {
        this.attributes.set(name, value);
      },
      removeAttribute() {},
      replaceChildren() {},
      append() {},
      showModal() {
        this.open = true;
      },
      close() {
        this.open = false;
      },
      focus() {},
      querySelector: () => null,
      getBoundingClientRect: () => ({ width: 0, height: 0 }),
      addEventListener(name, callback) {
        this.listeners.set(name, callback);
      },
    };
  };
  const messageButtons = ["upper", "lower"].map((position) => {
    const button = makeElement();
    button.dataset.position = position;
    return button;
  });
  const logoButtons = ["upper", "lower"].map((position) => {
    const button = makeElement();
    button.dataset.logoPosition = position;
    return button;
  });
  let fullscreenExits = 0;
  let fullscreenRequests = 0;
  const intervals = new Map();
  let nextInterval = 1;
  globalThis.document = {
    body: makeElement(),
    addEventListener(name, callback) {
      documentListeners.set(name, callback);
    },
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, makeElement());
      return nodes.get(id);
    },
    createElement: makeElement,
    querySelector: () => null,
    querySelectorAll: (selector) => {
      if (selector === "[data-position]") return messageButtons;
      if (selector === "[data-logo-position]") return logoButtons;
      return [];
    },
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
  globalThis.window = {
    clearTimeout() {},
    clearInterval(id) {
      intervals.delete(id);
    },
    setTimeout: () => 0,
    setInterval(callback) {
      const id = nextInterval++;
      intervals.set(id, callback);
      return id;
    },
  };
  globalThis.HTMLMediaElement = { HAVE_CURRENT_DATA: 2 };
  globalThis.requestAnimationFrame = () => 0;
  globalThis.cancelAnimationFrame = () => {};
  try {
    const { model } = await import("../src/scripts/studio/state/model.ts");
    const { runtime } = await import("../src/scripts/studio/state/runtime.ts");
    const { updateLiveUi } = await import("../src/scripts/studio/ui/update-live-ui.ts");
    const { applyWorkspaceSettings } =
      await import("../src/scripts/studio/ui/apply-workspace-settings.ts");
    const savedModel = { ...model };
    const savedRuntime = { ...runtime };
    try {
      model.config = { ...model.config, fairMode: false };
      updateLiveUi();
      assert.equal(nodes.get("studio-live-camera").textContent, "Start live camera");
      assert.ok(nodes.get("studio-stop-live").classList.contains("is-hidden"));
      assert.ok(messageButtons.every((button) => !button.disabled));
      assert.ok(logoButtons.every((button) => !button.disabled));
      assert.equal(nodes.get("logo-section").classList.contains("is-hidden"), false);
      model.messagePosition = "lower";
      updateLiveUi();
      assert.equal(messageButtons[0].classList.contains("is-selected"), false);
      assert.equal(messageButtons[1].classList.contains("is-selected"), true);
      assert.equal(messageButtons[1].attributes.get("aria-pressed"), "true");

      let stopped = 0;
      model.liveCameraActive = true;
      runtime.liveCameraStream = { getTracks: () => [{ stop: () => stopped++ }] };
      document.body.classList.add("fair-mode");
      applyWorkspaceSettings();
      assert.equal(model.liveCameraActive, true);
      assert.equal(stopped, 0);
      assert.equal(
        fullscreenExits,
        1,
        "leaving fair mode exits its fullscreen without stopping video",
      );
      assert.equal(nodes.get("studio-live-camera").textContent, "Snap & freeze");
      assert.equal(nodes.get("studio-stop-live").classList.contains("is-hidden"), false);
      assert.equal(
        nodes.get("compare-photo").disabled,
        true,
        "do not compare live video with a stale still",
      );

      document.fullscreenElement = {};
      applyWorkspaceSettings();
      assert.equal(
        fullscreenExits,
        1,
        "normal settings preserve independently requested fullscreen",
      );
      assert.equal(model.liveCameraActive, true);
      assert.equal(fullscreenRequests, 0);

      document.fullscreenElement = null;
      model.config.fairMode = true;
      applyWorkspaceSettings();
      assert.equal(fullscreenRequests, 1, "entering fair mode can expand the existing live stream");
      assert.equal(model.liveCameraActive, true);
      assert.equal(stopped, 0);

      assert.ok(messageButtons.every((button) => button.disabled));
      assert.ok(logoButtons.every((button) => button.disabled));
      assert.equal(nodes.get("logo-section").classList.contains("is-hidden"), true);
      model.config.messagePositionLocked = false;
      updateLiveUi();
      assert.ok(messageButtons.every((button) => !button.disabled));
      assert.ok(logoButtons.every((button) => button.disabled));

      model.liveCameraActive = false;
      runtime.liveCameraStarting = true;
      updateLiveUi();
      assert.equal(nodes.get("studio-live-camera").disabled, true);
      assert.equal(nodes.get("studio-stop-live").classList.contains("is-hidden"), false);

      const { updateCaptureGesture } =
        await import("../src/scripts/studio/camera/update-capture-gesture.ts");
      const { stopLiveCamera } = await import("../src/scripts/studio/camera/stop-live-camera.ts");
      const { cancelFreezeCountdown } =
        await import("../src/scripts/studio/camera/cancel-freeze-countdown.ts");
      let hands = [[], openPalm];
      runtime.handLandmarker = { detectForVideo: () => ({ landmarks: hands }) };
      runtime.liveCameraStarting = false;
      model.liveCameraActive = true;
      nodes.get("live-camera-video").readyState = 2;
      updateCaptureGesture(1000);
      updateCaptureGesture(1600);
      assert.equal(runtime.gestureCountdownTimer, 0, "a brief palm does not capture");
      updateCaptureGesture(1700);
      const firstCountdown = runtime.gestureCountdownTimer;
      assert.ok(firstCountdown > 0, "an open second hand starts the countdown");
      assert.equal(nodes.get("gesture-count").textContent, "3");
      intervals.get(firstCountdown)();
      assert.equal(nodes.get("gesture-count").textContent, "2");
      stopLiveCamera(false);
      assert.equal(runtime.gestureCountdownTimer, 0);
      assert.equal(intervals.has(firstCountdown), false);

      model.liveCameraActive = true;
      updateCaptureGesture(2000);
      updateCaptureGesture(2800);
      assert.ok(runtime.gestureCountdownTimer > 0, "capture works after stopping mid-countdown");
      cancelFreezeCountdown();
      updateCaptureGesture(4000);
      updateCaptureGesture(5000);
      assert.equal(runtime.gestureCountdownTimer, 0, "one held palm cannot repeatedly capture");
      hands = [];
      updateCaptureGesture(5100);
      hands = [openPalm];
      updateCaptureGesture(5200);
      updateCaptureGesture(5900);
      assert.ok(runtime.gestureCountdownTimer > 0, "lowering the hand rearms gesture capture");
      stopLiveCamera(false);

      await t.test(
        "the spacing slider updates artwork and its label without resampling",
        async () => {
          const { bindCanvasEvents } =
            await import("../src/scripts/studio/events/bind-canvas-events.ts");
          model.image = { width: 40, height: 20 };
          model.gridCols = 2;
          model.gridRows = 1;
          model.tileSize = 20;
          model.messageEnabled = false;
          model.showBadge = false;
          const cells = [0, 1].map((col) => ({ col, row: 0, isSubject: true, clusterIndex: 0 }));
          model.cells = cells;
          bindCanvasEvents();
          const slider = nodes.get("tile-spacing");
          slider.value = "0";
          slider.listeners.get("input")();
          assert.equal(model.tileSpacingPercent, 0);
          assert.equal(nodes.get("tile-spacing-value").textContent, "0%");
          assert.match(model.currentSvg, /d="M0 0h20v20h-20ZM20 0h20v20h-20Z"/);
          slider.value = "50";
          slider.listeners.get("input")();
          assert.equal(model.tileSpacingPercent, 50);
          assert.equal(nodes.get("tile-spacing-value").textContent, "50%");
          assert.match(model.currentSvg, /d="M5 5h10v10h-10ZM25 5h10v10h-10Z"/);
          assert.equal(model.cells, cells);
        },
      );

      await t.test(
        "public fullscreen toggles preserve normal mode and camera, and follow Escape",
        async () => {
          const { bindViewportEvents } =
            await import("../src/scripts/studio/events/bind-viewport-events.ts");
          const { toggleFullscreen } =
            await import("../src/scripts/studio/viewport/toggle-fullscreen.ts");
          model.config.fairMode = false;
          model.liveCameraActive = true;
          const stream = { getTracks: () => [{ stop: () => stopped++ }] };
          runtime.liveCameraStream = stream;
          const previousStops = stopped;
          document.fullscreenElement = null;
          bindViewportEvents();
          const button = nodes.get("studio-fullscreen");
          const label = nodes.get("studio-fullscreen-label");
          assert.equal(typeof button.listeners.get("click"), "function");
          assert.equal(label.textContent, "Fullscreen");
          await toggleFullscreen();
          assert.ok(document.fullscreenElement);
          assert.equal(label.textContent, "Exit fullscreen");
          assert.equal(button.attributes.get("aria-pressed"), "true");
          assert.equal(model.config.fairMode, false);
          assert.equal(model.liveCameraActive, true);
          assert.equal(runtime.liveCameraStream, stream);
          assert.equal(stopped, previousStops);
          await toggleFullscreen();
          assert.equal(document.fullscreenElement, null);
          assert.equal(label.textContent, "Fullscreen");
          await toggleFullscreen();
          document.fullscreenElement = null;
          documentListeners.get("fullscreenchange")();
          assert.equal(label.textContent, "Fullscreen");
          assert.equal(button.attributes.get("aria-pressed"), "false");
        },
      );

      await t.test(
        "unavailable and blocked fullscreen show feedback without claiming success",
        async (t) => {
          const { toggleFullscreen } =
            await import("../src/scripts/studio/viewport/toggle-fullscreen.ts");
          const requestFullscreen = document.documentElement.requestFullscreen;
          const errors = t.mock.method(console, "error", () => {});
          try {
            document.documentElement.requestFullscreen = undefined;
            await toggleFullscreen();
            assert.match(nodes.get("toast").textContent, /unavailable/);
            document.documentElement.requestFullscreen = async () => {
              throw new Error("Fullscreen blocked");
            };
            await toggleFullscreen();
            assert.equal(errors.mock.callCount(), 1);
            assert.match(nodes.get("toast").textContent, /Could not enter fullscreen/);
            assert.equal(nodes.get("studio-fullscreen-label").textContent, "Fullscreen");
            assert.equal(nodes.get("studio-fullscreen").attributes.get("aria-pressed"), "false");
          } finally {
            document.documentElement.requestFullscreen = requestFullscreen;
          }
        },
      );
      await t.test(
        "public kiosk previews never persist and exit by button, Escape, or browser exit",
        async () => {
          const { enterPublicKiosk } =
            await import("../src/scripts/studio/viewport/enter-public-kiosk.ts");
          const { leavePublicKiosk } =
            await import("../src/scripts/studio/viewport/leave-public-kiosk.ts");
          const { handleEscapeKey } =
            await import("../src/scripts/studio/events/handle-escape-key.ts");
          const { handleFullscreenChange } =
            await import("../src/scripts/studio/events/handle-fullscreen-change.ts");
          model.image = null;
          model.config.fairMode = false;
          document.fullscreenElement = null;
          let writes = 0;
          localStorage.setItem = () => {
            writes++;
          };
          const stream = runtime.liveCameraStream;
          await enterPublicKiosk();
          handleFullscreenChange();
          assert.equal(runtime.publicKioskMode, true);
          assert.equal(model.config.fairMode, false);
          assert.equal(document.body.classList.contains("fair-mode"), true);
          assert.equal(nodes.get("live-leave-kiosk").classList.contains("is-hidden"), false);
          leavePublicKiosk();
          assert.equal(runtime.publicKioskMode, false);
          assert.equal(document.body.classList.contains("fair-mode"), false);
          assert.equal(document.fullscreenElement, null);
          await enterPublicKiosk();
          handleEscapeKey({ key: "Escape", preventDefault() {} });
          assert.equal(runtime.publicKioskMode, false);
          await enterPublicKiosk();
          document.fullscreenElement = null;
          handleFullscreenChange();
          assert.equal(runtime.publicKioskMode, false);
          assert.equal(model.config.fairMode, false);
          assert.equal(runtime.liveCameraStream, stream);
          assert.equal(model.liveCameraActive, true);
          assert.equal(writes, 0);
        },
      );

      await t.test(
        "admin kiosks keep their lock after Escape and reject public exit controls",
        async () => {
          const { leavePublicKiosk } =
            await import("../src/scripts/studio/viewport/leave-public-kiosk.ts");
          const { handleEscapeKey } =
            await import("../src/scripts/studio/events/handle-escape-key.ts");
          const { handleFullscreenChange } =
            await import("../src/scripts/studio/events/handle-fullscreen-change.ts");
          const { toggleFullscreen } =
            await import("../src/scripts/studio/viewport/toggle-fullscreen.ts");
          model.config.fairMode = true;
          applyWorkspaceSettings();
          handleEscapeKey({ key: "Escape", preventDefault() {} });
          leavePublicKiosk();
          assert.equal(model.config.fairMode, true);
          assert.equal(document.body.classList.contains("fair-mode"), true);
          document.fullscreenElement = null;
          handleFullscreenChange();
          assert.equal(model.config.fairMode, true);
          assert.equal(document.body.classList.contains("fair-mode"), true);
          assert.equal(nodes.get("live-leave-kiosk").classList.contains("is-hidden"), true);
          assert.equal(nodes.get("live-fullscreen").classList.contains("is-hidden"), false);
          document.fullscreenElement = {};
          await toggleFullscreen();
          assert.ok(document.fullscreenElement);
          assert.equal(nodes.get("pin-dialog").open, true);
          nodes.get("pin-dialog").close();
        },
      );
    } finally {
      Object.assign(model, savedModel);
      Object.assign(runtime, savedRuntime);
    }
  } finally {
    Object.assign(globalThis, previous);
  }
});
