import { HandLandmarker } from '@mediapipe/tasks-vision';
import { getActiveTheme, loadConfig, saveConfig } from '../lib/config';
import { isAllowedPaletteColor } from '../lib/color';
import { createHandLandmarker, isOpenPalm } from '../lib/gesture';
import {
  deleteBrandAsset,
  deleteGalleryFreeze,
  getBrandAsset,
  getGalleryFreeze,
  listGalleryFreezes,
  saveBrandAsset,
  saveGalleryFreeze,
} from '../lib/local-store';
import { mapClustersToTheme, sampleImage } from '../lib/sampling';
import { createArtworkSvg } from '../lib/svg';
import type { GalleryFreeze } from '../lib/local-store';
import type {
  AppModel,
  BackgroundMode,
  BrandTheme,
  ImageSource,
  MessagePosition,
  SamplingOptions,
  TileOverride,
  ToolMode,
} from '../lib/types';

const $ = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Studio element "${id}" is missing from the page.`);
  return element as T;
};

const config = loadConfig();
const model: AppModel = {
  config,
  image: null,
  fileName: 'pixel-artwork',
  tileSize: 18,
  freeColorCount: 7,
  background: 'black',
  includeBackground: true,
  subjectEnabled: true,
  subjectThreshold: 52,
  subjectContrast: 78,
  backgroundDensity: 58,
  backgroundScatter: 72,
  randomSeed: 4219,
  messageEnabled: true,
  message: config.defaultMessage,
  messagePosition: config.messagePosition,
  messageOrigin: null,
  logoOrigin: null,
  messageScale: 100,
  logoDataUrl: null,
  logoAspectRatio: 1,
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontDataUri: null,
  showBadge: true,
  clusters: [],
  cells: [],
  saliency: new Float32Array(),
  gridCols: 0,
  gridRows: 0,
  clusterToTheme: [],
  manualSubjectMask: new Map(),
  manualTileOverrides: new Map(),
  tileUndoStack: [],
  currentSvg: '',
  tool: 'pan',
  selectedBrush: config.themes[0].colors[0],
  maskBrush: 'keep',
  zoom: 1,
  panX: 0,
  panY: 0,
  showOriginal: false,
  liveCameraActive: false,
  freezePreview: false,
};

const elements = {
  brandTitle: $('brand-title'),
  modeLabel: $('mode-label'),
  fileInput: $('photo-input') as HTMLInputElement,
  dropZone: $('drop-zone'),
  sourceThumb: $('source-thumb') as HTMLImageElement,
  fileName: $('file-name'),
  sourceDimensions: $('source-dimensions'),
  subjectEnabled: $('subject-enabled') as HTMLInputElement,
  subjectControls: $('subject-controls'),
  subjectThreshold: $('subject-threshold') as HTMLInputElement,
  subjectThresholdValue: $('subject-threshold-value'),
  subjectContrast: $('subject-contrast') as HTMLInputElement,
  subjectContrastValue: $('subject-contrast-value'),
  backgroundDensity: $('background-density') as HTMLInputElement,
  backgroundDensityValue: $('background-density-value'),
  backgroundScatter: $('background-scatter') as HTMLInputElement,
  backgroundScatterValue: $('background-scatter-value'),
  messageEnabled: $('message-enabled') as HTMLInputElement,
  messageControls: $('message-controls'),
  messageText: $('message-text') as HTMLTextAreaElement,
  messageScale: $('message-scale') as HTMLInputElement,
  messageScaleValue: $('message-scale-value'),
  showBadge: $('show-badge') as HTMLInputElement,
  paletteCount: $('palette-count'),
  mappingList: $('mapping-list'),
  mappingControls: $('mapping-controls'),
  freePaletteControls: $('free-palette-controls'),
  freeColorCount: $('free-color-count') as HTMLInputElement,
  freeColorCountValue: $('free-color-count-value'),
  brushSwatches: $('brush-swatches'),
  brushHelp: $('brush-help'),
  maskBrushes: $('mask-brushes'),
  undoTiles: $('undo-tiles') as HTMLButtonElement,
  clearTiles: $('clear-tiles'),
  tileSize: $('tile-size') as HTMLInputElement,
  tileSizeNumber: $('tile-size-number') as HTMLInputElement,
  gridCount: $('grid-count'),
  includeBackground: $('include-background') as HTMLInputElement,
  stage: $('stage'),
  transform: $('artboard-transform'),
  artboard: $('artboard'),
  svgOutput: $('svg-output'),
  originalPhoto: $('original-photo') as HTMLImageElement,
  emptyState: $('empty-state'),
  liveIndicator: $('live-indicator'),
  liveBrandTitle: $('live-brand-title'),
  liveStatus: $('live-status'),
  livePrompt: $('live-camera-prompt'),
  livePromptBrand: $('live-prompt-brand'),
  livePromptTitle: $('live-prompt-title'),
  livePromptCopy: $('live-prompt-copy'),
  liveCameraError: $('live-camera-error'),
  liveCameraVideo: $('live-camera-video') as HTMLVideoElement,
  drawerBackdrop: $('drawer-backdrop'),
  zoomSlider: $('zoom-slider') as HTMLInputElement,
  zoomValue: $('zoom-value'),
  comparePhoto: $('compare-photo') as HTMLButtonElement,
  pinDialog: $('pin-dialog') as HTMLDialogElement,
  pinInput: $('pin-input') as HTMLInputElement,
  pinError: $('pin-error'),
  adminDialog: $('admin-dialog') as HTMLDialogElement,
  cameraDialog: $('camera-dialog') as HTMLDialogElement,
  cameraVideo: $('camera-video') as HTMLVideoElement,
  cameraStatus: $('camera-status'),
  shareDialog: $('share-dialog') as HTMLDialogElement,
  shareNative: $('share-native') as HTMLButtonElement,
  shareHelp: $('share-help'),
  toast: $('toast'),
};

let activeImageUrl: string | null = null;
let cameraStream: MediaStream | null = null;
let liveCameraStream: MediaStream | null = null;
let liveFrameCanvas: HTMLCanvasElement | null = null;
let liveFrameRequest = 0;
let lastLiveFrameAt = 0;
let toastTimer = 0;
let processFrame = 0;
let pointerStart: { x: number; y: number; panX: number; panY: number } | null = null;
let messageDragOffset = { col: 0, row: 0 };
let logoDragOffset = { col: 0, row: 0 };
let handLandmarker: HandLandmarker | null = null;
let gestureStartedAt = 0;
let gesturePalmPoint: { x: number; y: number } | null = null;
let lastGestureFrameAt = 0;
let gestureCountdownTimer = 0;
let freezePreviewTimer = 0;
let galleryObjectUrls: string[] = [];
const selectedGalleryIds = new Set<string>();
let painting = false;
let pendingSubjectEdit = false;

function notify(message: string): void {
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => elements.toast.classList.remove('is-visible'), 2600);
}

function updateLiveUi(): void {
  const fairMode = model.config.fairMode;
  const hasArtwork = Boolean(model.image);
  elements.liveBrandTitle.textContent = model.config.applicationTitle;
  elements.livePromptBrand.textContent = model.config.applicationTitle;
  elements.emptyState.classList.toggle('is-hidden', hasArtwork || fairMode);
  elements.livePrompt.classList.toggle('is-hidden', !fairMode || hasArtwork);
  elements.liveIndicator.classList.toggle('is-active', model.liveCameraActive);
  elements.liveStatus.textContent = model.liveCameraActive
    ? model.freezePreview ? 'Portrait preview' : 'Live portrait'
    : hasArtwork ? 'Portrait ready' : 'Fair portrait studio';
  $('live-camera-label').textContent = model.liveCameraActive ? 'Snap & freeze' : 'New portrait';
  $('live-camera').setAttribute('aria-label', model.liveCameraActive ? 'Freeze this portrait' : 'Start a new portrait');
  $('return-to-live').classList.toggle('is-hidden', !model.freezePreview);
  $('drawer-open').setAttribute('aria-expanded', String(document.body.classList.contains('drawer-open')));
  document.querySelectorAll<HTMLButtonElement>('[data-position]').forEach((button) => {
    button.disabled = model.config.messagePositionLocked;
  });
}

function setDrawerOpen(open: boolean): void {
  document.body.classList.toggle('drawer-open', open);
  $('drawer-open').setAttribute('aria-expanded', String(open));
}

function persistSettings(): void {
  try {
    saveConfig(model.config);
  } catch (error) {
    notify(error instanceof Error ? error.message : 'Settings could not be saved.');
  }
}

function getSamplingOptions(): SamplingOptions {
  return {
    tileSize: model.tileSize,
    subjectEnabled: model.subjectEnabled,
    subjectThreshold: model.subjectThreshold,
    subjectContrast: model.subjectContrast,
    backgroundDensity: model.backgroundDensity,
    darkCutoffPercent: model.config.darkCutoffPercent,
    lightCutoffPercent: model.config.lightCutoffPercent,
    colorCount: model.config.enforceTheme ? getActiveTheme(model.config).colors.length : model.freeColorCount,
    randomSeed: model.randomSeed,
    manualSubjectMask: model.manualSubjectMask,
  };
}

function rebuildArtwork(fit = false): void {
  if (!model.image) return;
  try {
    const previousMapping = model.clusterToTheme;
    const sampled = sampleImage(model.image, getSamplingOptions());
    model.cells = sampled.cells;
    model.clusters = sampled.clusters;
    model.saliency = sampled.saliency;
    model.gridCols = sampled.cols;
    model.gridRows = sampled.rows;

    if (previousMapping.length === model.clusters.length) {
      model.clusterToTheme = previousMapping.map((index) =>
        index % getActiveTheme(model.config).colors.length);
    } else {
      model.clusterToTheme = mapClustersToTheme(
        model.clusters,
        getActiveTheme(model.config).colors,
      );
    }

    renderMapping();
    renderArtwork();
    elements.gridCount.textContent = `${model.gridCols} × ${model.gridRows}`;
    if (fit) requestAnimationFrame(fitArtboard);
  } catch (error) {
    console.error('Could not generate the pixel artwork.', error);
    notify(error instanceof Error ? error.message : 'The image could not be processed.');
  }
}

function renderArtwork(): void {
  const result = createArtworkSvg({
    grid: {
      cols: model.gridCols,
      rows: model.gridRows,
      cells: model.cells,
      clusters: model.clusters,
      saliency: model.saliency,
    },
    tileSize: model.tileSize,
    theme: getActiveTheme(model.config),
    enforceTheme: model.config.enforceTheme,
    clusterToTheme: model.clusterToTheme,
    manualTileOverrides: model.manualTileOverrides,
    background: model.background,
    includeBackground: model.includeBackground,
    hairlines: model.config.hairlines,
    backgroundScatter: model.backgroundScatter,
    randomSeed: model.randomSeed,
    messageEnabled: model.messageEnabled,
    message: model.message,
    messagePosition: model.messagePosition,
    messageOrigin: model.messageOrigin,
    messageScale: model.messageScale,
    brandSignature: model.config.brandSignature,
    showBadge: model.showBadge,
    logoDataUrl: model.logoDataUrl,
    logoAspectRatio: model.logoAspectRatio,
    logoPosition: model.config.logoPosition,
    logoOrigin: model.logoOrigin,
    fontFamily: model.config.useUploadedFont ? model.fontFamily : 'Arial, Helvetica, sans-serif',
    fontDataUri: model.config.useUploadedFont ? model.fontDataUri : null,
  });
  model.currentSvg = result.markup;
  elements.svgOutput.innerHTML = result.markup;
  elements.svgOutput.setAttribute('aria-label', `Artwork with ${result.tileCount} colored tiles`);
  elements.svgOutput.style.width = `${model.gridCols * model.tileSize}px`;
  elements.svgOutput.style.height = `${model.gridRows * model.tileSize}px`;
  const svg = elements.svgOutput.querySelector('svg');
  if (svg) {
    svg.style.display = 'block';
    svg.style.width = '100%';
    svg.style.height = '100%';
  }
  elements.artboard.style.width = `${model.gridCols * model.tileSize}px`;
  elements.artboard.style.height = `${model.gridRows * model.tileSize}px`;
  $('stat-tiles').textContent = result.tileCount.toLocaleString();
  $('stat-paths').textContent = result.pathCount.toLocaleString();
  $('stat-size').textContent = `${Math.max(1, Math.round(result.byteCount / 1024))} KB`;
  renderUndoControls();
  updateViewportTransform();
}

function renderMapping(): void {
  const theme = getActiveTheme(model.config);
  elements.paletteCount.textContent = model.config.enforceTheme
    ? `${theme.colors.length} colors`
    : `${model.freeColorCount} free`;
  elements.mappingList.replaceChildren();
  elements.mappingControls.classList.toggle('is-hidden', !model.config.enforceTheme);
  elements.freePaletteControls.classList.toggle('is-hidden', model.config.enforceTheme || model.config.fairMode);

  if (model.config.enforceTheme) {
    model.clusters.forEach((cluster, clusterIndex) => {
      const paletteIndex = model.clusterToTheme[clusterIndex] ?? 0;
      const assigned = theme.colors[paletteIndex] ?? theme.colors[0];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mapping-item';
      button.title = `Change ${cluster.hex} to another brand color`;
      button.setAttribute('aria-label', `Photo tone ${cluster.hex} maps to ${assigned}. Change color.`);

      const tones = document.createElement('span');
      tones.className = 'mapping-tones';
      const source = document.createElement('i');
      source.className = 'mapping-swatch';
      source.style.backgroundColor = cluster.hex;
      source.setAttribute('aria-hidden', 'true');
      const arrow = document.createElement('span');
      arrow.textContent = '→';
      arrow.setAttribute('aria-hidden', 'true');
      const target = document.createElement('i');
      target.className = 'mapping-swatch target';
      target.style.backgroundColor = assigned;
      target.setAttribute('aria-hidden', 'true');
      tones.append(source, arrow, target);
      const colorLabel = document.createElement('span');
      colorLabel.textContent = assigned;
      button.append(tones, colorLabel);
      button.addEventListener('click', () => {
        model.clusterToTheme[clusterIndex] = (paletteIndex + 1) % theme.colors.length;
        renderMapping();
        renderArtwork();
      });
      elements.mappingList.append(button);
    });
  }
  renderBrushSwatches();
}

function renderBrushSwatches(): void {
  const theme = getActiveTheme(model.config);
  const colors = model.config.enforceTheme
    ? theme.colors
    : model.clusters.map((cluster) => cluster.hex);
  if (model.selectedBrush !== 'ERASE' && !colors.includes(model.selectedBrush)) {
    model.selectedBrush = colors[0] ?? theme.colors[0];
  }
  elements.brushSwatches.replaceChildren();
  for (const color of colors) {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'brush-swatch';
    swatch.style.backgroundColor = color;
    swatch.title = `Paint with ${color}`;
    swatch.setAttribute('aria-label', `Paint with ${color}`);
    swatch.setAttribute('aria-pressed', String(model.selectedBrush === color));
    if (model.selectedBrush === color) swatch.classList.add('is-selected');
    swatch.addEventListener('click', () => {
      model.selectedBrush = color;
      setTool('recolor');
      renderBrushSwatches();
    });
    elements.brushSwatches.append(swatch);
  }

  const erase = document.createElement('button');
  erase.type = 'button';
  erase.className = `erase-swatch${model.selectedBrush === 'ERASE' ? ' is-selected' : ''}`;
  erase.textContent = '⌫ Hole';
  erase.title = 'Erase a tile to the background';
  erase.setAttribute('aria-pressed', String(model.selectedBrush === 'ERASE'));
  erase.addEventListener('click', () => {
    model.selectedBrush = 'ERASE';
    setTool('recolor');
    renderBrushSwatches();
  });
  elements.brushSwatches.append(erase);
}

function renderUndoControls(): void {
  elements.undoTiles.disabled = model.tileUndoStack.length === 0;
  elements.clearTiles.classList.toggle('is-hidden', model.manualTileOverrides.size === 0);
}

function setTool(tool: ToolMode): void {
  model.tool = tool;
  document.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((button) => {
    const selected = button.dataset.tool === tool;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  elements.maskBrushes.classList.toggle('is-hidden', tool !== 'subject');
  elements.brushSwatches.classList.toggle('is-hidden', tool === 'subject');
  const hints: Record<ToolMode, string> = {
    pan: 'Drag to move · Scroll to zoom',
    recolor: 'Tap or drag across tiles to recolor',
    subject: 'Paint areas to keep as subject or scatter as background',
  };
  $('hint-text').textContent = hints[tool];
  $('hint-dot').className = `hint-dot hint-${tool}`;
}

function applyWorkspaceSettings(): void {
  if (!model.config.fairMode && model.liveCameraActive) stopLiveCamera(true);
  if (!model.config.fairMode && document.fullscreenElement) {
    void document.exitFullscreen().catch((error: unknown) => {
      console.error('Could not exit fullscreen mode.', error);
      notify('Could not leave fullscreen mode. Press Escape to exit.');
    });
  }
  const theme = getActiveTheme(model.config);
  elements.brandTitle.textContent = model.config.applicationTitle;
  document.title = `${model.config.applicationTitle} — Photo to SVG`;
  elements.modeLabel.textContent = model.config.fairMode
    ? 'Fair kiosk'
    : model.config.enforceTheme ? theme.name : 'Free palette';
  document.body.classList.toggle('fair-mode', model.config.fairMode);
  document.querySelectorAll<HTMLElement>('.fair-hide').forEach((element) => {
    element.classList.toggle('is-hidden', model.config.fairMode);
  });
  const hideIfVisitorCannot = (id: string, permission: keyof typeof model.config.permissions) => {
    $(id).classList.toggle(
      'is-hidden',
      model.config.fairMode && !model.config.permissions[permission],
    );
  };
  hideIfVisitorCannot('subject-section', 'subject');
  hideIfVisitorCannot('message-section', 'message');
  hideIfVisitorCannot('tile-size-section', 'size');
  hideIfVisitorCannot('canvas-section', 'background');
  hideIfVisitorCannot('brush-section', 'recolor');
  elements.mappingList.classList.toggle(
    'is-hidden',
    model.config.fairMode && !model.config.permissions.mapping,
  );
  elements.mappingControls.classList.toggle(
    'is-hidden',
    !model.config.enforceTheme || (model.config.fairMode && !model.config.permissions.mapping),
  );
  $('free-palette-controls').classList.toggle(
    'is-hidden',
    model.config.enforceTheme || model.config.fairMode,
  );
  updateLiveUi();
  if (model.config.fairMode) setDrawerOpen(false);
  renderMapping();
  rebuildArtwork();
  if (model.image) requestAnimationFrame(fitArtboard);
}

function setBackground(background: BackgroundMode): void {
  model.background = background;
  document.querySelectorAll<HTMLButtonElement>('[data-background]').forEach((button) => {
    const selected = button.dataset.background === background;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  elements.artboard.classList.remove('artboard-dark', 'artboard-light', 'artboard-transparent');
  const artboardClass = background === 'black'
    ? 'artboard-dark'
    : background === 'white' ? 'artboard-light' : 'artboard-transparent';
  elements.artboard.classList.add(artboardClass);
  renderArtwork();
}

function updateViewportTransform(): void {
  elements.transform.style.transform = `translate(${model.panX}px, ${model.panY}px) scale(${model.zoom})`;
  elements.zoomValue.textContent = `${Math.round(model.zoom * 100)}%`;
  elements.zoomSlider.value = String(Math.min(400, Math.max(15, Math.round(model.zoom * 100))));
}

function setZoom(value: number): void {
  model.zoom = Math.max(0.15, Math.min(4, value));
  updateViewportTransform();
}

function fitArtboard(): void {
  const stage = elements.stage.getBoundingClientRect();
  const width = model.gridCols * model.tileSize;
  const height = model.gridRows * model.tileSize;
  if (!width || !height || !stage.width || !stage.height) return;
  const padding = model.config.fairMode ? 0 : 72;
  model.zoom = Math.max(0.15, Math.min(
    2.5,
    Math.min(
      Math.max(1, stage.width - padding) / width,
      Math.max(1, stage.height - padding) / height,
    ),
  ));
  model.panX = 0;
  model.panY = 0;
  updateViewportTransform();
}

function saveTileUndoSnapshot(): void {
  model.tileUndoStack.push(new Map(model.manualTileOverrides));
  if (model.tileUndoStack.length > 30) model.tileUndoStack.shift();
  renderUndoControls();
}

function paintAt(clientX: number, clientY: number): void {
  const rect = elements.artboard.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const col = Math.floor(((clientX - rect.left) / rect.width) * model.gridCols);
  const row = Math.floor(((clientY - rect.top) / rect.height) * model.gridRows);
  if (col < 0 || col >= model.gridCols || row < 0 || row >= model.gridRows) return;
  const key = `${col},${row}`;

  if (model.tool === 'subject') {
    const keep = model.maskBrush === 'keep';
    if (model.manualSubjectMask.get(key) === keep) return;
    model.manualSubjectMask.set(key, keep);
    pendingSubjectEdit = true;
    if (!processFrame) {
      processFrame = requestAnimationFrame(() => {
        processFrame = 0;
        if (pendingSubjectEdit) {
          pendingSubjectEdit = false;
          rebuildArtwork();
        }
      });
    }
    $('reset-mask').classList.remove('is-hidden');
    return;
  }

  if (model.manualTileOverrides.get(key) === model.selectedBrush) return;
  model.manualTileOverrides.set(key, model.selectedBrush);
  renderArtwork();
}

function revokeActiveImageUrl(): void {
  if (activeImageUrl) URL.revokeObjectURL(activeImageUrl);
  activeImageUrl = null;
}

function setImageSource(image: ImageSource, fileName: string, previewUrl?: string): void {
  revokeActiveImageUrl();
  activeImageUrl = previewUrl?.startsWith('blob:') ? previewUrl : null;
  model.image = image;
  model.fileName = fileName.replace(/\.[^.]+$/, '') || 'pixel-artwork';
  model.manualSubjectMask.clear();
  model.manualTileOverrides.clear();
  model.tileUndoStack = [];
  model.messageOrigin = null;
  model.showOriginal = false;
  const width = image instanceof HTMLImageElement ? image.naturalWidth || image.width : image.width;
  const height = image instanceof HTMLImageElement ? image.naturalHeight || image.height : image.height;
  const preview = previewUrl ?? (image instanceof HTMLCanvasElement ? image.toDataURL('image/png') : image.src);
  elements.fileName.textContent = fileName;
  elements.sourceDimensions.textContent = `${width} × ${height}`;
  elements.sourceThumb.src = preview;
  elements.originalPhoto.src = preview;
  elements.originalPhoto.hidden = true;
  elements.comparePhoto.textContent = 'Compare photo';
  $('reset-mask').classList.add('is-hidden');
  renderUndoControls();
  updateLiveUi();
  rebuildArtwork(true);
}

async function loadImage(source: string, fileName: string, sourceUrl?: string): Promise<void> {
  if (model.liveCameraActive) stopLiveCamera(false);
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('This image could not be decoded. Try a PNG, JPEG, WebP, or GIF image.'));
    image.src = source;
  });
  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error('The selected image has no readable pixels.');
  }
  if (image.naturalWidth * image.naturalHeight > 40_000_000) {
    throw new Error('This image is larger than 40 megapixels. Choose a smaller image.');
  }
  setImageSource(image, fileName, sourceUrl ?? source);
}

async function openFile(file: File): Promise<void> {
  const supportedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  if (!supportedTypes.includes(file.type)) {
    notify('Choose a PNG, JPEG, WebP, or GIF image.');
    return;
  }
  if (file.size > 20 * 1024 * 1024) {
    notify('This image is larger than 20 MB. Choose a smaller file.');
    return;
  }
  const url = URL.createObjectURL(file);
  try {
    await loadImage(url, file.name, url);
    notify(`Loaded ${file.name}`);
  } catch (error) {
    URL.revokeObjectURL(url);
    notify(error instanceof Error ? error.message : 'The image could not be opened.');
  }
}

function renderAdminSettings(): void {
  ($('setting-lock-palette') as HTMLInputElement).checked = model.config.enforceTheme;
  ($('setting-fair-mode') as HTMLInputElement).checked = model.config.fairMode;
  ($('setting-title') as HTMLInputElement).value = model.config.applicationTitle;
  ($('setting-signature') as HTMLInputElement).value = model.config.brandSignature;
  ($('setting-message') as HTMLTextAreaElement).value = model.config.defaultMessage;
  ($('setting-message-position') as HTMLSelectElement).value = model.config.messagePosition;
  ($('setting-lock-message-position') as HTMLInputElement).checked = model.config.messagePositionLocked;
  ($('setting-logo-position') as HTMLSelectElement).value = model.config.logoPosition;
  ($('setting-lock-logo-position') as HTMLInputElement).checked = model.config.logoPositionLocked;
  ($('setting-clear-gallery') as HTMLInputElement).checked = model.config.clearGalleryAfterShare;
  ($('setting-gallery-delay') as HTMLInputElement).value = String(model.config.galleryClearDelaySeconds);
  ($('setting-font-choice') as HTMLSelectElement).value = model.config.useUploadedFont ? 'uploaded' : 'system';
  $('setting-font-name').textContent = model.fontDataUri ? 'Uploaded font ready' : 'System font';
  const logoPreview = $('setting-logo-preview') as HTMLImageElement;
  logoPreview.src = model.logoDataUrl ?? '';
  logoPreview.classList.toggle('is-hidden', !model.logoDataUrl);
  ($('setting-dark-cutoff') as HTMLInputElement).value = String(model.config.darkCutoffPercent);
  ($('setting-light-cutoff') as HTMLInputElement).value = String(model.config.lightCutoffPercent);
  ($('setting-hairlines') as HTMLInputElement).checked = model.config.hairlines;
  ($('setting-pin') as HTMLInputElement).value = '';
  $('dark-cutoff-value').textContent = `${model.config.darkCutoffPercent}%`;
  $('light-cutoff-value').textContent = `${model.config.lightCutoffPercent}%`;

  const permissionIds: Record<keyof typeof model.config.permissions, string> = {
    subject: 'permission-subject',
    message: 'permission-message',
    size: 'permission-size',
    background: 'permission-background',
    mapping: 'permission-mapping',
    recolor: 'permission-recolor',
  };
  Object.entries(permissionIds).forEach(([permission, id]) => {
    ($(id) as HTMLInputElement).checked = model.config.permissions[permission as keyof typeof model.config.permissions];
  });

  const themeSelect = $('setting-theme') as HTMLSelectElement;
  themeSelect.replaceChildren();
  model.config.themes.forEach((theme) => {
    const option = document.createElement('option');
    option.value = theme.id;
    option.textContent = `${theme.name} · ${theme.colors.length}`;
    option.selected = theme.id === model.config.activeThemeId;
    themeSelect.append(option);
  });
  renderThemeColors();
}

function renderThemeColors(): void {
  const theme = getActiveTheme(model.config);
  const container = $('theme-colors');
  container.replaceChildren();
  theme.colors.forEach((color, index) => {
    const row = document.createElement('div');
    row.className = 'theme-color-row';
    const picker = document.createElement('input');
    picker.type = 'color';
    picker.value = color;
    picker.setAttribute('aria-label', `Choose brand color ${index + 1}`);
    const text = document.createElement('input');
    text.type = 'text';
    text.value = color;
    text.maxLength = 7;
    text.className = 'text-input color-text-input';
    text.setAttribute('aria-label', `Hex value for brand color ${index + 1}`);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'text-button remove-color';
    remove.textContent = 'Remove';
    remove.disabled = theme.colors.length <= 2;
    const updateColor = (value: string) => {
      const normalized = value.startsWith('#') ? value.toUpperCase() : `#${value.toUpperCase()}`;
      if (!isAllowedPaletteColor(normalized)) {
        notify('Use a valid color that is not near black or white.');
        text.value = theme.colors[index];
        picker.value = theme.colors[index];
        return;
      }
      theme.colors[index] = normalized;
      text.value = normalized;
      picker.value = normalized;
      persistSettings();
      renderMapping();
      renderArtwork();
    };
    picker.addEventListener('input', () => updateColor(picker.value));
    text.addEventListener('change', () => updateColor(text.value));
    remove.addEventListener('click', () => {
      if (theme.colors.length <= 2) return;
      theme.colors.splice(index, 1);
      persistSettings();
      renderAdminSettings();
      applyWorkspaceSettings();
    });
    row.append(picker, text, remove);
    container.append(row);
  });
}

function applyAdminSettings(): void {
  const enforceTheme = ($('setting-lock-palette') as HTMLInputElement).checked;
  const fairMode = ($('setting-fair-mode') as HTMLInputElement).checked;
  const title = ($('setting-title') as HTMLInputElement).value.trim();
  const signature = ($('setting-signature') as HTMLInputElement).value.trim();
  const defaultMessage = ($('setting-message') as HTMLTextAreaElement).value;
  const pin = ($('setting-pin') as HTMLInputElement).value.trim();
  if (pin && pin.length < 3) {
    notify('PIN must contain at least 3 characters.');
    return;
  }
  model.config.enforceTheme = enforceTheme;
  model.config.fairMode = fairMode;
  model.config.applicationTitle = title || 'Pixel Studio';
  model.config.brandSignature = signature;
  model.config.defaultMessage = defaultMessage;
  model.config.messagePosition = ($('setting-message-position') as HTMLSelectElement).value as MessagePosition;
  model.config.messagePositionLocked = ($('setting-lock-message-position') as HTMLInputElement).checked;
  model.config.logoPosition = ($('setting-logo-position') as HTMLSelectElement).value as MessagePosition;
  model.config.logoPositionLocked = ($('setting-lock-logo-position') as HTMLInputElement).checked;
  model.config.clearGalleryAfterShare = ($('setting-clear-gallery') as HTMLInputElement).checked;
  model.config.galleryClearDelaySeconds = Math.max(
    0,
    Math.min(30, Number(($('setting-gallery-delay') as HTMLInputElement).value) || 0),
  );
  model.config.useUploadedFont = ($('setting-font-choice') as HTMLSelectElement).value === 'uploaded';
  model.config.darkCutoffPercent = Number(($('setting-dark-cutoff') as HTMLInputElement).value);
  model.config.lightCutoffPercent = Number(($('setting-light-cutoff') as HTMLInputElement).value);
  model.config.hairlines = ($('setting-hairlines') as HTMLInputElement).checked;
  if (pin) model.config.adminPin = pin;
  const permissionIds: Record<keyof typeof model.config.permissions, string> = {
    subject: 'permission-subject',
    message: 'permission-message',
    size: 'permission-size',
    background: 'permission-background',
    mapping: 'permission-mapping',
    recolor: 'permission-recolor',
  };
  Object.entries(permissionIds).forEach(([permission, id]) => {
    model.config.permissions[permission as keyof typeof model.config.permissions] = ($(id) as HTMLInputElement).checked;
  });
  model.message = defaultMessage;
  model.messagePosition = model.config.messagePosition;
  model.messageOrigin = null;
  model.logoOrigin = null;
  elements.messageText.value = defaultMessage;
  persistSettings();
  elements.adminDialog.close();
  applyWorkspaceSettings();
  renderArtwork();
  notify('Brand and kiosk settings applied.');
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('The local brand asset could not be read.'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('The local brand asset could not be read.'));
    reader.readAsDataURL(blob);
  });
}

async function rasterizeLogo(blob: Blob): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('The logo could not be decoded.'));
      image.src = objectUrl;
    });
    const scale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser could not prepare the logo image.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const raster = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error('The logo image could not be prepared.')), 'image/png');
    });
    return {
      blob: raster,
      dataUrl: await readBlobAsDataUrl(raster),
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function sanitizeSvgLogo(file: File): Promise<Blob> {
  const source = await file.text();
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error('SVG logos cannot contain document declarations.');
  const documentSvg = new DOMParser().parseFromString(source, 'image/svg+xml');
  if (documentSvg.querySelector('parsererror')
    || documentSvg.documentElement.localName !== 'svg'
    || documentSvg.documentElement.namespaceURI !== 'http://www.w3.org/2000/svg') {
    throw new Error('Choose a valid SVG logo.');
  }
  const prohibited = new Set([
    'script', 'style', 'foreignObject', 'iframe', 'object', 'embed', 'audio', 'video',
    'animate', 'animateMotion', 'animateTransform', 'set',
  ]);
  for (const element of [documentSvg.documentElement, ...Array.from(documentSvg.querySelectorAll('*'))]) {
    if (prohibited.has(element.localName)) throw new Error('SVG logos cannot contain active content.');
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (name.startsWith('on') || name === 'style' || name === 'xml:base') {
        throw new Error('SVG logos cannot contain scripts, inline styles, or remote content.');
      }
      if ((name === 'href' || name.endsWith(':href')) && value && !value.startsWith('#')) {
        throw new Error('SVG logos cannot reference external files.');
      }
      if (/url\s*\(/i.test(value) && !/^url\(\s*#[\w.-]+\s*\)$/i.test(value)) {
        throw new Error('SVG logos cannot reference external files.');
      }
    }
  }
  return new Blob([new XMLSerializer().serializeToString(documentSvg.documentElement)], {
    type: 'image/svg+xml',
  });
}

async function uploadLogo(file: File): Promise<void> {
  if (file.size > 5 * 1024 * 1024) throw new Error('Logo files must be 5 MB or smaller.');
  const source = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
    ? await sanitizeSvgLogo(file)
    : file;
  const raster = await rasterizeLogo(source);
  const asset = await saveBrandAsset({
    kind: 'logo',
    name: file.name,
    type: raster.blob.type,
    blob: raster.blob,
    width: raster.width,
    height: raster.height,
  });
  if (model.config.logoAssetId) await deleteBrandAsset(model.config.logoAssetId);
  model.config.logoAssetId = asset.id;
  model.logoDataUrl = raster.dataUrl;
  model.logoAspectRatio = raster.width / raster.height;
  model.logoOrigin = null;
  persistSettings();
  const preview = $('setting-logo-preview') as HTMLImageElement;
  preview.src = raster.dataUrl;
  preview.classList.remove('is-hidden');
  renderArtwork();
  notify('Brand logo saved on this device.');
}

async function uploadFont(file: File): Promise<void> {
  if (file.size > 10 * 1024 * 1024) throw new Error('Font files must be 10 MB or smaller.');
  const allowedTypes = new Set(['font/woff2', 'font/woff', 'font/ttf', 'font/otf', 'application/font-woff', 'application/octet-stream']);
  if (!allowedTypes.has(file.type) && !/\.(woff2?|ttf|otf)$/i.test(file.name)) {
    throw new Error('Choose a WOFF2, WOFF, TTF, or OTF font file.');
  }
  const blobUrl = URL.createObjectURL(file);
  try {
    const face = new FontFace('BrandUploaded', `url("${blobUrl}")`);
    await face.load();
    document.fonts.add(face);
    const asset = await saveBrandAsset({
      kind: 'font',
      name: file.name,
      type: file.type || 'application/octet-stream',
      blob: file,
    });
    if (model.config.fontAssetId) await deleteBrandAsset(model.config.fontAssetId);
    model.config.fontAssetId = asset.id;
    model.config.useUploadedFont = true;
    model.fontFamily = 'BrandUploaded';
    model.fontDataUri = await readBlobAsDataUrl(file);
    persistSettings();
    $('setting-font-name').textContent = file.name;
    ($('setting-font-choice') as HTMLSelectElement).value = 'uploaded';
    renderArtwork();
    notify('Uploaded font saved on this device.');
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

async function loadBrandAssets(): Promise<void> {
  if (model.config.logoAssetId) {
    const asset = await getBrandAsset(model.config.logoAssetId);
    if (asset?.kind === 'logo') {
      const raster = await rasterizeLogo(asset.blob);
      model.logoDataUrl = raster.dataUrl;
      model.logoAspectRatio = asset.width && asset.height ? asset.width / asset.height : raster.width / raster.height;
    }
  }

  if (model.config.fontAssetId) {
    const asset = await getBrandAsset(model.config.fontAssetId);
    if (asset?.kind === 'font') {
      const objectUrl = URL.createObjectURL(asset.blob);
      try {
        const face = new FontFace('BrandUploaded', `url("${objectUrl}")`);
        await face.load();
        document.fonts.add(face);
        model.fontDataUri = await readBlobAsDataUrl(asset.blob);
        model.fontFamily = 'BrandUploaded';
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    }
  }
}

function revokeGalleryObjectUrls(): void {
  galleryObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  galleryObjectUrls = [];
}

async function refreshGallery(): Promise<void> {
  const freezes = await listGalleryFreezes();
  const grid = $('gallery-grid');
  revokeGalleryObjectUrls();
  grid.replaceChildren();
  $('gallery-count').textContent = String(freezes.length);
  $('gallery-empty').classList.toggle('is-hidden', freezes.length > 0);

  freezes.forEach((freeze, index) => {
    const url = URL.createObjectURL(freeze.blob);
    galleryObjectUrls.push(url);
    const card = document.createElement('article');
    card.className = `gallery-card${selectedGalleryIds.has(freeze.id) ? ' is-selected' : ''}`;
    card.draggable = true;
    card.dataset.freezeId = freeze.id;

    const preview = document.createElement('img');
    preview.src = url;
    preview.alt = `Saved pixel portrait ${index + 1}`;
    preview.addEventListener('click', () => void previewGalleryFreeze(freeze));

    const controls = document.createElement('div');
    controls.className = 'gallery-card-controls';
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selectedGalleryIds.has(freeze.id);
    checkbox.setAttribute('aria-label', `Select portrait ${index + 1} to share`);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selectedGalleryIds.add(freeze.id);
      else selectedGalleryIds.delete(freeze.id);
      card.classList.toggle('is-selected', checkbox.checked);
      updateGallerySelection();
    });
    const date = document.createElement('span');
    date.textContent = new Date(freeze.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    label.append(checkbox, date);

    const previewButton = document.createElement('button');
    previewButton.type = 'button';
    previewButton.className = 'button button-quiet gallery-preview-button';
    previewButton.textContent = 'Preview';
    previewButton.addEventListener('click', () => void previewGalleryFreeze(freeze));
    controls.append(label, previewButton);
    card.addEventListener('dragstart', (event) => {
      event.dataTransfer?.setData('text/plain', freeze.id);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
    });
    let touchDragStart: { x: number; y: number; moved: boolean } | null = null;
    preview.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse') return;
      touchDragStart = { x: event.clientX, y: event.clientY, moved: false };
      preview.setPointerCapture(event.pointerId);
    });
    preview.addEventListener('pointermove', (event) => {
      if (!touchDragStart) return;
      if (Math.hypot(event.clientX - touchDragStart.x, event.clientY - touchDragStart.y) > 12) {
        touchDragStart.moved = true;
      }
    });
    preview.addEventListener('pointerup', (event) => {
      if (!touchDragStart) return;
      const { moved } = touchDragStart;
      touchDragStart = null;
      if (!moved) return;
      event.preventDefault();
      const bounds = elements.stage.getBoundingClientRect();
      if (event.clientX >= bounds.left && event.clientX <= bounds.right
        && event.clientY >= bounds.top && event.clientY <= bounds.bottom) {
        void previewGalleryFreeze(freeze);
      }
    });
    preview.addEventListener('pointercancel', () => { touchDragStart = null; });
    card.append(preview, controls);
    grid.append(card);
  });
  updateGallerySelection();
}

function updateGallerySelection(): void {
  const count = selectedGalleryIds.size;
  $('gallery-selection-count').textContent = `${count} selected`;
  ($('gallery-share') as HTMLButtonElement).disabled = count === 0;
}

async function openGallery(): Promise<void> {
  try {
    await refreshGallery();
    $('gallery-overlay').classList.remove('is-hidden');
  } catch (error) {
    console.error('The local portrait gallery could not be opened.', error);
    notify(error instanceof Error ? error.message : 'The portrait gallery could not be opened.');
  }
}

async function shareSelectedGalleryFreezes(): Promise<void> {
  if (!navigator.share) {
    try {
      const freezes = await listGalleryFreezes();
      const selected = freezes.filter((freeze) => selectedGalleryIds.has(freeze.id));
      if (!selected.length) {
        notify('Select at least one portrait to save.');
        return;
      }
      selected.forEach((freeze, index) => downloadBlob(freeze.blob, `pixel-portrait-${index + 1}.png`));
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Selected portraits could not be saved.');
    }
    return;
  }
  try {
    const freezes = await listGalleryFreezes();
    const selected = freezes.filter((freeze) => selectedGalleryIds.has(freeze.id));
    if (!selected.length) {
      notify('Select at least one portrait to share.');
      return;
    }
    const files = selected.map((freeze, index) => (
      new File([freeze.blob], `pixel-portrait-${index + 1}.png`, { type: 'image/png' })
    ));
    if (!navigator.canShare?.({ files })) {
      notify('This device cannot share the selected image files.');
      return;
    }
    await navigator.share({ files, title: model.config.applicationTitle });
    $('gallery-overlay').classList.add('is-hidden');
    if (model.config.clearGalleryAfterShare) {
      const ids = selected.map((freeze) => freeze.id);
      window.setTimeout(() => {
        void Promise.all(ids.map((id) => deleteGalleryFreeze(id)))
          .then(() => {
            ids.forEach((id) => selectedGalleryIds.delete(id));
            return refreshGallery();
          })
          .catch((error: unknown) => {
            console.error('Shared gallery portraits could not be removed.', error);
            notify('Shared portraits could not be removed from local storage.');
          });
      }, model.config.galleryClearDelaySeconds * 1000);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    console.error('Selected gallery portraits could not be shared.', error);
    notify(error instanceof Error ? error.message : 'Selected portraits could not be shared.');
  }
}

function openAdminGate(): void {
  elements.pinInput.value = '';
  elements.pinError.classList.add('is-hidden');
  elements.pinDialog.showModal();
  elements.pinInput.focus();
}

function submitPin(): void {
  if (elements.pinInput.value !== model.config.adminPin) {
    elements.pinError.classList.remove('is-hidden');
    elements.pinInput.value = '';
    return;
  }
  elements.pinDialog.close();
  renderAdminSettings();
  elements.adminDialog.showModal();
}

async function openCamera(): Promise<void> {
  elements.cameraStatus.textContent = 'Requesting camera access…';
  elements.cameraStatus.classList.remove('is-hidden');
  elements.cameraDialog.showModal();
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera access is not available in this browser or page context.');
    }
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 900 }, height: { ideal: 700 } },
      audio: false,
    });
    elements.cameraVideo.srcObject = cameraStream;
    elements.cameraStatus.classList.add('is-hidden');
  } catch (error) {
    elements.cameraStatus.textContent = error instanceof Error
      ? `${error.message} You can still add a photo file.`
      : 'Camera access was denied. You can still add a photo file.';
  }
}

function closeCamera(): void {
  cameraStream?.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  elements.cameraVideo.srcObject = null;
  if (elements.cameraDialog.open) elements.cameraDialog.close();
}

async function capturePhoto(): Promise<void> {
  const video = elements.cameraVideo;
  if (!video.videoWidth || !video.videoHeight) {
    notify('Wait for the camera preview to become ready.');
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');
  if (!context) {
    notify('Could not capture from the camera.');
    return;
  }
  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  try {
    await loadImage(canvas.toDataURL('image/png'), `visitor-${Date.now().toString().slice(-5)}.png`);
    closeCamera();
    notify('Photo captured and pixelated.');
  } catch (error) {
    notify(error instanceof Error ? error.message : 'Could not use the captured photo.');
  }
}

function drawCameraFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement, outputHeight: number): boolean {
  if (!video.videoWidth || !video.videoHeight) return false;
  const aspectRatio = Math.max(0.5, Math.min(3, window.innerWidth / Math.max(1, window.innerHeight)));
  const sourceAspectRatio = video.videoWidth / video.videoHeight;
  let sx = 0;
  let sy = 0;
  let sourceWidth = video.videoWidth;
  let sourceHeight = video.videoHeight;
  if (sourceAspectRatio > aspectRatio) {
    sourceWidth = video.videoHeight * aspectRatio;
    sx = (video.videoWidth - sourceWidth) / 2;
  } else {
    sourceHeight = video.videoWidth / aspectRatio;
    sy = (video.videoHeight - sourceHeight) / 2;
  }

  canvas.width = Math.round(outputHeight * aspectRatio);
  canvas.height = outputHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser could not prepare the camera image.');
  context.save();
  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(video, sx, sy, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
  context.restore();
  return true;
}

function updateLiveFrame(timestamp: number): void {
  if (!model.liveCameraActive || !liveFrameCanvas) return;
  if (timestamp - lastLiveFrameAt >= 180) {
    if (!model.freezePreview && elements.liveCameraVideo.videoWidth) {
      const previousWidth = liveFrameCanvas.width;
      const previousHeight = liveFrameCanvas.height;
      if (drawCameraFrame(elements.liveCameraVideo, liveFrameCanvas, 900)) {
        rebuildArtwork(previousWidth !== liveFrameCanvas.width || previousHeight !== liveFrameCanvas.height);
      }
    }
    lastLiveFrameAt = timestamp;
  }
  if (!model.freezePreview && handLandmarker && timestamp - lastGestureFrameAt >= 140) {
    lastGestureFrameAt = timestamp;
    if (elements.liveCameraVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const result = handLandmarker.detectForVideo(elements.liveCameraVideo, timestamp);
      if (result.landmarks[0] && isOpenPalm(result.landmarks[0])) {
        const wrist = result.landmarks[0][0];
        if (gesturePalmPoint && Math.hypot(wrist.x - gesturePalmPoint.x, wrist.y - gesturePalmPoint.y) > 0.08) {
          gestureStartedAt = 0;
        }
        gesturePalmPoint = { x: wrist.x, y: wrist.y };
        if (!gestureStartedAt) gestureStartedAt = timestamp;
        if (timestamp - gestureStartedAt >= 700) beginFreezeCountdown();
      } else {
        gestureStartedAt = 0;
        gesturePalmPoint = null;
      }
    }
  }
  liveFrameRequest = requestAnimationFrame(updateLiveFrame);
}

function stopLiveCamera(freeze: boolean): void {
  const shouldFreeze = freeze && model.liveCameraActive;
  let frozenFrame: HTMLCanvasElement | null = null;
  if (shouldFreeze && liveFrameCanvas && elements.liveCameraVideo.videoWidth) {
    frozenFrame = document.createElement('canvas');
    if (!drawCameraFrame(elements.liveCameraVideo, frozenFrame, 1500)) frozenFrame = null;
  }

  model.liveCameraActive = false;
  model.freezePreview = false;
  gestureStartedAt = 0;
  gesturePalmPoint = null;
  window.clearInterval(gestureCountdownTimer);
  window.clearTimeout(freezePreviewTimer);
  $('gesture-countdown').classList.add('is-hidden');
  cancelAnimationFrame(liveFrameRequest);
  liveFrameRequest = 0;
  liveCameraStream?.getTracks().forEach((track) => track.stop());
  liveCameraStream = null;
  elements.liveCameraVideo.srcObject = null;
  liveFrameCanvas = null;

  if (frozenFrame) {
    setImageSource(frozenFrame, `portrait-${new Date().toISOString().slice(0, 10)}.png`);
  } else if (!freeze) {
    model.image = null;
    updateLiveUi();
  } else {
    updateLiveUi();
  }
}

async function startLiveCamera(): Promise<void> {
  elements.liveCameraError.classList.add('is-hidden');
  if (!navigator.mediaDevices?.getUserMedia) {
    elements.liveCameraError.textContent = 'Camera access is unavailable here. Choose a photo instead.';
    elements.liveCameraError.classList.remove('is-hidden');
    notify('Camera access is unavailable. Choose a photo instead.');
    return;
  }

  let fullscreenRequest = Promise.resolve(Boolean(document.fullscreenElement));
  if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
    try {
      fullscreenRequest = document.documentElement.requestFullscreen().then(() => true).catch(() => false);
    } catch {
      fullscreenRequest = Promise.resolve(false);
    }
  }
  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false,
    });
    elements.liveCameraVideo.srcObject = stream;
    await elements.liveCameraVideo.play();
    if (!elements.liveCameraVideo.videoWidth) {
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('The camera preview did not become ready.')), 5000);
        elements.liveCameraVideo.addEventListener('loadeddata', () => {
          window.clearTimeout(timeout);
          resolve();
        }, { once: true });
      });
    }

    liveCameraStream = stream;
    stream = null;
    liveFrameCanvas = document.createElement('canvas');
    if (!drawCameraFrame(elements.liveCameraVideo, liveFrameCanvas, 900)) {
      throw new Error('The camera did not provide an image.');
    }
    try {
      handLandmarker ??= await createHandLandmarker(import.meta.env.BASE_URL);
    } catch (error) {
      console.error('Offline hand gesture recognition could not be initialized.', error);
      notify('Gesture recognition is unavailable. Use the capture button instead.');
    }
    model.liveCameraActive = true;
    model.freezePreview = false;
    setImageSource(liveFrameCanvas, 'live-portrait.png');
    lastLiveFrameAt = 0;
    liveFrameRequest = requestAnimationFrame(updateLiveFrame);
    const enteredFullscreen = await fullscreenRequest;
    notify(enteredFullscreen
      ? 'Live portrait is ready. Tap “Snap & freeze” to keep it.'
      : 'Live portrait is ready. Fullscreen is unavailable here; tap “Snap & freeze” to keep it.');
  } catch (error) {
    stream?.getTracks().forEach((track) => track.stop());
    liveCameraStream?.getTracks().forEach((track) => track.stop());
    liveCameraStream = null;
    liveFrameCanvas = null;
    elements.liveCameraVideo.srcObject = null;
    model.liveCameraActive = false;
    const message = error instanceof Error ? error.message : 'Camera access was denied.';
    elements.liveCameraError.textContent = `${message} You can still choose a photo.`;
    elements.liveCameraError.classList.remove('is-hidden');
    updateLiveUi();
    notify(`${message} You can still choose a photo.`);
  }
}

function freezeLiveCamera(): void {
  if (!model.liveCameraActive) {
    void startLiveCamera();
    return;
  }
  freezeLiveFrame();
}

function beginFreezeCountdown(): void {
  if (!model.liveCameraActive || gestureCountdownTimer) return;
  gestureStartedAt = 0;
  gesturePalmPoint = null;
  let count = 3;
  $('gesture-count').textContent = String(count);
  $('gesture-countdown').classList.remove('is-hidden');
  gestureCountdownTimer = window.setInterval(() => {
    count -= 1;
    if (count > 0) {
      $('gesture-count').textContent = String(count);
      return;
    }
    window.clearInterval(gestureCountdownTimer);
    gestureCountdownTimer = 0;
    $('gesture-countdown').classList.add('is-hidden');
    freezeLiveFrame();
  }, 1000);
}

function freezeLiveFrame(): void {
  if (!model.liveCameraActive || !liveFrameCanvas) return;
  const frozenFrame = document.createElement('canvas');
  if (!drawCameraFrame(elements.liveCameraVideo, frozenFrame, 1500)) {
    notify('The camera frame is not ready yet.');
    return;
  }
  model.freezePreview = true;
  setImageSource(frozenFrame, `portrait-${new Date().toISOString().slice(0, 10)}.png`);
  updateLiveUi();
  window.clearTimeout(freezePreviewTimer);
  freezePreviewTimer = window.setTimeout(returnToLive, 3000);
  void createPngBlob().then(saveGalleryFreeze).then(() => refreshGallery()).catch((error: unknown) => {
    console.error('The frozen portrait could not be saved to the local gallery.', error);
    notify(error instanceof Error ? error.message : 'The portrait could not be saved to the gallery.');
  });
  notify('Portrait frozen for 3 seconds and saved to the gallery.');
}

function returnToLive(): void {
  window.clearTimeout(freezePreviewTimer);
  if (!model.liveCameraActive || !liveFrameCanvas) return;
  model.freezePreview = false;
  setImageSource(liveFrameCanvas, 'live-portrait.png');
  updateLiveUi();
}

async function previewGalleryFreeze(freeze: GalleryFreeze): Promise<void> {
  const url = URL.createObjectURL(freeze.blob);
  const image = new Image();
  let retainedUrl = false;
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('This saved portrait could not be opened.'));
      image.src = url;
    });
    $('gallery-overlay').classList.add('is-hidden');
    if (model.liveCameraActive) {
      window.clearTimeout(freezePreviewTimer);
      model.freezePreview = true;
      setImageSource(image, 'gallery-portrait.png', url);
      updateLiveUi();
    } else {
      setImageSource(image, 'gallery-portrait.png', url);
    }
    retainedUrl = true;
  } catch (error) {
    notify(error instanceof Error ? error.message : 'The saved portrait could not be opened.');
  } finally {
    if (!retainedUrl) URL.revokeObjectURL(url);
  }
}

function openShareDialog(): void {
  if (!model.image || !model.currentSvg) {
    notify('Take a photo or choose one before sharing.');
    return;
  }
  if (model.liveCameraActive) stopLiveCamera(true);
  elements.shareNative.hidden = typeof navigator.share !== 'function';
  elements.shareDialog.showModal();
}

async function createPngBlob(): Promise<Blob> {
  if (!model.image || !model.currentSvg) throw new Error('There is no artwork to export yet.');
  const image = new Image();
  const svgUrl = URL.createObjectURL(new Blob([model.currentSvg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('The SVG could not be prepared as an image.'));
      image.src = svgUrl;
    });
    const scale = Math.min(1, 4096 / Math.max(model.gridCols * model.tileSize, model.gridRows * model.tileSize));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(model.gridCols * model.tileSize * scale));
    canvas.height = Math.max(1, Math.round(model.gridRows * model.tileSize * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser could not prepare the PNG image.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('The PNG image could not be created.'));
      }, 'image/png');
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify(`Saved ${fileName}`);
}

async function sharePngWithDevice(): Promise<void> {
  if (!navigator.share) {
    notify('Device sharing is not available. Save the PNG or SVG instead.');
    return;
  }
  try {
    const blob = await createPngBlob();
    const file = new File([blob], `${model.fileName}.png`, { type: 'image/png' });
    if (!navigator.canShare?.({ files: [file] })) {
      elements.shareDialog.close();
      notify('This device cannot share image files. Save the PNG or SVG instead.');
      return;
    }
    await navigator.share({ files: [file], title: model.config.applicationTitle });
    elements.shareDialog.close();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    elements.shareDialog.close();
    notify(error instanceof Error ? error.message : 'The share sheet could not be opened.');
  }
}

async function downloadPng(): Promise<void> {
  try {
    downloadBlob(await createPngBlob(), `${model.fileName}.png`);
  } catch (error) {
    notify(error instanceof Error ? error.message : 'The PNG image could not be saved.');
  }
}

function downloadSvg(): void {
  if (!model.image || !model.currentSvg) {
    notify('Take a photo or choose one before exporting.');
    return;
  }
  const blob = new Blob([model.currentSvg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${model.fileName}-${getActiveTheme(model.config).id}-${model.tileSize}px.svg`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  notify(`Exported ${link.download}`);
}

async function copySvg(): Promise<void> {
  if (!model.image || !model.currentSvg) {
    notify('Take a photo or choose one before copying the SVG.');
    return;
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(model.currentSvg);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = model.currentSvg;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.append(textArea);
      textArea.select();
      const copied = document.execCommand('copy');
      textArea.remove();
      if (!copied) throw new Error('Clipboard access is unavailable in this browser.');
    }
    notify('SVG copied to the clipboard.');
  } catch (error) {
    notify(error instanceof Error ? error.message : 'Could not copy the SVG.');
  }
}

function bindRange(
  input: HTMLInputElement,
  output: HTMLElement,
  onChange: (value: number) => void,
  suffix = '%',
): void {
  input.addEventListener('input', () => {
    const value = Number(input.value);
    output.textContent = `${value}${suffix}`;
    onChange(value);
  });
}

function syncTileSize(value: string): void {
  const next = Math.max(4, Math.min(80, Number.parseInt(value, 10) || 18));
  model.tileSize = next;
  elements.tileSize.value = String(next);
  elements.tileSizeNumber.value = String(next);
  document.querySelectorAll<HTMLButtonElement>('[data-size]').forEach((button) => {
    button.classList.toggle('is-selected', Number(button.dataset.size) === next);
  });
  rebuildArtwork();
}

function randomizeColors(): void {
  if (!model.clusters.length) {
    notify('Take a photo before choosing new colors.');
    return;
  }
  const colors = getActiveTheme(model.config).colors;
  const shuffled = Array.from({ length: colors.length }, (_, index) => index);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  model.clusterToTheme = model.clusters.map((_, index) => shuffled[index % shuffled.length]);
  model.randomSeed = Math.floor(Math.random() * 999_999) + 1;
  renderMapping();
  renderArtwork();
  notify('A fresh colorway is ready.');
}

function bindEvents(): void {
  $('upload-open').addEventListener('click', () => elements.fileInput.click());
  $('empty-upload').addEventListener('click', () => elements.fileInput.click());
  $('live-upload').addEventListener('click', () => elements.fileInput.click());
  $('empty-camera').addEventListener('click', () => void openCamera());
  elements.dropZone.addEventListener('click', () => elements.fileInput.click());
  elements.fileInput.addEventListener('change', () => {
    const file = elements.fileInput.files?.[0];
    if (file) void openFile(file);
    elements.fileInput.value = '';
  });
  elements.dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    elements.dropZone.classList.add('is-dragover');
  });
  elements.dropZone.addEventListener('dragleave', () => elements.dropZone.classList.remove('is-dragover'));
  elements.dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove('is-dragover');
    const file = (event as DragEvent).dataTransfer?.files[0];
    if (file) void openFile(file);
  });

  $('camera-open').addEventListener('click', () => void openCamera());
  $('capture-photo').addEventListener('click', () => void capturePhoto());
  $('camera-dialog').addEventListener('close', closeCamera);
  $('live-start-camera').addEventListener('click', () => void startLiveCamera());
  $('live-camera').addEventListener('click', freezeLiveCamera);
  $('live-new-colors').addEventListener('click', randomizeColors);
  $('live-admin').addEventListener('click', openAdminGate);
  $('gallery-open').addEventListener('click', () => void openGallery());
  $('gallery-close').addEventListener('click', () => $('gallery-overlay').classList.add('is-hidden'));
  $('gallery-share').addEventListener('click', () => void shareSelectedGalleryFreezes());
  $('return-to-live').addEventListener('click', returnToLive);
  $('setting-logo-file').addEventListener('change', () => {
    const file = ($('setting-logo-file') as HTMLInputElement).files?.[0];
    if (file) void uploadLogo(file).catch((error: unknown) => notify(
      error instanceof Error ? error.message : 'The logo could not be uploaded.',
    ));
    ($('setting-logo-file') as HTMLInputElement).value = '';
  });
  $('setting-font-file').addEventListener('change', () => {
    const file = ($('setting-font-file') as HTMLInputElement).files?.[0];
    if (file) void uploadFont(file).catch((error: unknown) => notify(
      error instanceof Error ? error.message : 'The font could not be uploaded.',
    ));
    ($('setting-font-file') as HTMLInputElement).value = '';
  });
  $('remove-logo').addEventListener('click', () => {
    const id = model.config.logoAssetId;
    model.config.logoAssetId = null;
    model.logoDataUrl = null;
    model.logoOrigin = null;
    if (id) void deleteBrandAsset(id).catch((error: unknown) => {
      console.error('The saved logo could not be removed.', error);
      notify('The saved logo could not be removed from local storage.');
    });
    persistSettings();
    ($('setting-logo-preview') as HTMLImageElement).removeAttribute('src');
    $('setting-logo-preview').classList.add('is-hidden');
    renderArtwork();
  });
  $('remove-font').addEventListener('click', () => {
    const id = model.config.fontAssetId;
    model.config.fontAssetId = null;
    model.config.useUploadedFont = false;
    model.fontFamily = 'Arial, Helvetica, sans-serif';
    model.fontDataUri = null;
    if (id) void deleteBrandAsset(id).catch((error: unknown) => {
      console.error('The saved font could not be removed.', error);
      notify('The saved font could not be removed from local storage.');
    });
    persistSettings();
    $('setting-font-name').textContent = 'System font';
    ($('setting-font-choice') as HTMLSelectElement).value = 'system';
    renderArtwork();
  });
  $('drawer-open').addEventListener('click', () => setDrawerOpen(true));
  $('drawer-close').addEventListener('click', () => setDrawerOpen(false));
  elements.drawerBackdrop.addEventListener('click', () => setDrawerOpen(false));
  document.querySelectorAll<HTMLButtonElement>('[data-action="share"]').forEach((button) => {
    button.addEventListener('click', openShareDialog);
  });
  $('share-native').addEventListener('click', () => void sharePngWithDevice());
  $('share-download-png').addEventListener('click', () => {
    elements.shareDialog.close();
    void downloadPng();
  });
  $('share-download-svg').addEventListener('click', () => {
    elements.shareDialog.close();
    downloadSvg();
  });
  $('share-copy-svg').addEventListener('click', () => {
    elements.shareDialog.close();
    void copySvg();
  });

  bindRange(elements.subjectThreshold, elements.subjectThresholdValue, (value) => {
    model.subjectThreshold = value;
    rebuildArtwork();
  });
  bindRange(elements.subjectContrast, elements.subjectContrastValue, (value) => {
    model.subjectContrast = value;
    rebuildArtwork();
  });
  bindRange(elements.backgroundDensity, elements.backgroundDensityValue, (value) => {
    model.backgroundDensity = value;
    rebuildArtwork();
  });
  bindRange(elements.backgroundScatter, elements.backgroundScatterValue, (value) => {
    model.backgroundScatter = value;
    renderArtwork();
  });
  elements.subjectEnabled.addEventListener('change', () => {
    model.subjectEnabled = elements.subjectEnabled.checked;
    elements.subjectControls.classList.toggle('is-disabled', !model.subjectEnabled);
    rebuildArtwork();
  });
  $('shuffle-background').addEventListener('click', () => {
    model.randomSeed = Math.floor(Math.random() * 999_999) + 1;
    rebuildArtwork();
    notify('Background pattern reshuffled.');
  });
  $('reset-mask').addEventListener('click', () => {
    model.manualSubjectMask.clear();
    $('reset-mask').classList.add('is-hidden');
    rebuildArtwork();
    notify('Automatic subject selection restored.');
  });

  elements.messageEnabled.addEventListener('change', () => {
    model.messageEnabled = elements.messageEnabled.checked;
    elements.messageControls.classList.toggle('is-disabled', !model.messageEnabled);
    renderArtwork();
  });
  elements.messageText.addEventListener('input', () => {
    model.message = elements.messageText.value;
    model.messageOrigin = null;
    renderArtwork();
  });
  document.querySelectorAll<HTMLButtonElement>('[data-position]').forEach((button) => {
    button.addEventListener('click', () => {
      model.messagePosition = button.dataset.position as MessagePosition;
      model.messageOrigin = null;
      document.querySelectorAll<HTMLButtonElement>('[data-position]').forEach((candidate) => {
        candidate.classList.toggle('is-selected', candidate === button);
      });
      renderArtwork();
    });
  });
  bindRange(elements.messageScale, elements.messageScaleValue, (value) => {
    model.messageScale = value;
    renderArtwork();
  });
  elements.showBadge.addEventListener('change', () => {
    model.showBadge = elements.showBadge.checked;
    renderArtwork();
  });

  $('rotate-colors').addEventListener('click', () => {
    const length = getActiveTheme(model.config).colors.length;
    model.clusterToTheme = model.clusterToTheme.map((index) => (index + 1) % length);
    renderMapping();
    renderArtwork();
    notify('Brand colors rotated.');
  });
  $('randomize-look').addEventListener('click', () => {
    randomizeColors();
  });
  $('auto-map').addEventListener('click', () => {
    model.clusterToTheme = mapClustersToTheme(model.clusters, getActiveTheme(model.config).colors);
    renderMapping();
    renderArtwork();
    notify('Photo tones mapped to the closest brand colors.');
  });

  document.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((button) => {
    button.addEventListener('click', () => setTool(button.dataset.tool as ToolMode));
  });
  document.querySelectorAll<HTMLButtonElement>('[data-mask]').forEach((button) => {
    button.addEventListener('click', () => {
      model.maskBrush = button.dataset.mask === 'keep' ? 'keep' : 'background';
      document.querySelectorAll<HTMLButtonElement>('[data-mask]').forEach((candidate) => {
        candidate.classList.toggle('is-selected', candidate === button);
      });
    });
  });
  elements.undoTiles.addEventListener('click', () => {
    const previous = model.tileUndoStack.pop();
    if (!previous) return;
    model.manualTileOverrides = previous;
    renderUndoControls();
    renderArtwork();
  });
  elements.clearTiles.addEventListener('click', () => {
    if (!model.manualTileOverrides.size) return;
    saveTileUndoSnapshot();
    model.manualTileOverrides.clear();
    renderArtwork();
    notify('Manual tile edits cleared.');
  });

  elements.tileSize.addEventListener('input', () => syncTileSize(elements.tileSize.value));
  elements.tileSizeNumber.addEventListener('change', () => syncTileSize(elements.tileSizeNumber.value));
  document.querySelectorAll<HTMLButtonElement>('[data-size]').forEach((button) => {
    button.addEventListener('click', () => syncTileSize(button.dataset.size ?? '18'));
  });
  bindRange(elements.freeColorCount, elements.freeColorCountValue, (value) => {
    model.freeColorCount = value;
    rebuildArtwork();
  }, '');
  document.querySelectorAll<HTMLButtonElement>('[data-background]').forEach((button) => {
    button.addEventListener('click', () => setBackground(button.dataset.background as BackgroundMode));
  });
  elements.includeBackground.addEventListener('change', () => {
    model.includeBackground = elements.includeBackground.checked;
    renderArtwork();
  });

  elements.stage.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const target = event.target;
    const messageTarget = target instanceof Element && target.closest('[data-draggable="message"]');
    const logoTarget = target instanceof Element && target.closest('[data-draggable="logo"]');
    if (messageTarget && model.messageEnabled && !model.config.messagePositionLocked && model.tool === 'pan') {
      const rect = elements.artboard.getBoundingClientRect();
      const pointerCol = Math.floor(((event.clientX - rect.left) / rect.width) * model.gridCols);
      const pointerRow = Math.floor(((event.clientY - rect.top) / rect.height) * model.gridRows);
      const box = messageTarget.getBoundingClientRect();
      const origin = model.messageOrigin ?? {
        col: Math.floor(((box.left - rect.left) / rect.width) * model.gridCols),
        row: Math.floor(((box.top - rect.top) / rect.height) * model.gridRows),
      };
      messageDragOffset = { col: pointerCol - origin.col, row: pointerRow - origin.row };
      elements.stage.setPointerCapture(event.pointerId);
      elements.stage.dataset.draggingMessage = 'true';
      return;
    }
    if (logoTarget && !model.config.logoPositionLocked && model.tool === 'pan') {
      const rect = elements.artboard.getBoundingClientRect();
      const pointerCol = Math.floor(((event.clientX - rect.left) / rect.width) * model.gridCols);
      const pointerRow = Math.floor(((event.clientY - rect.top) / rect.height) * model.gridRows);
      const box = logoTarget.getBoundingClientRect();
      const origin = model.logoOrigin ?? {
        col: Math.floor(((box.left - rect.left) / rect.width) * model.gridCols),
        row: Math.floor(((box.top - rect.top) / rect.height) * model.gridRows),
      };
      logoDragOffset = { col: pointerCol - origin.col, row: pointerRow - origin.row };
      elements.stage.setPointerCapture(event.pointerId);
      elements.stage.dataset.draggingLogo = 'true';
      return;
    }
    elements.stage.setPointerCapture(event.pointerId);
    if (model.tool === 'recolor' || model.tool === 'subject') {
      if (model.tool === 'recolor') saveTileUndoSnapshot();
      painting = true;
      paintAt(event.clientX, event.clientY);
    } else {
      pointerStart = { x: event.clientX, y: event.clientY, panX: model.panX, panY: model.panY };
    }
  });
  elements.stage.addEventListener('pointermove', (event) => {
    if (elements.stage.dataset.draggingMessage === 'true') {
      const rect = elements.artboard.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      model.messageOrigin = {
        col: Math.floor(((event.clientX - rect.left) / rect.width) * model.gridCols) - messageDragOffset.col,
        row: Math.floor(((event.clientY - rect.top) / rect.height) * model.gridRows) - messageDragOffset.row,
      };
      renderArtwork();
      return;
    }
    if (elements.stage.dataset.draggingLogo === 'true') {
      const rect = elements.artboard.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      model.logoOrigin = {
        col: Math.floor(((event.clientX - rect.left) / rect.width) * model.gridCols) - logoDragOffset.col,
        row: Math.floor(((event.clientY - rect.top) / rect.height) * model.gridRows) - logoDragOffset.row,
      };
      renderArtwork();
      return;
    }
    if (painting) {
      paintAt(event.clientX, event.clientY);
      return;
    }
    if (pointerStart && model.tool === 'pan') {
      model.panX = pointerStart.panX + event.clientX - pointerStart.x;
      model.panY = pointerStart.panY + event.clientY - pointerStart.y;
      updateViewportTransform();
    }
  });
  const endPointer = () => {
    pointerStart = null;
    painting = false;
    delete elements.stage.dataset.draggingMessage;
    delete elements.stage.dataset.draggingLogo;
  };
  elements.stage.addEventListener('pointerup', endPointer);
  elements.stage.addEventListener('pointercancel', endPointer);
  elements.stage.addEventListener('dragover', (event) => event.preventDefault());
  elements.stage.addEventListener('drop', (event) => {
    const freezeId = (event as DragEvent).dataTransfer?.getData('text/plain');
    if (!freezeId) return;
    event.preventDefault();
    void getGalleryFreeze(freezeId).then((freeze) => {
      if (!freeze) throw new Error('That saved portrait is no longer available.');
      return previewGalleryFreeze(freeze);
    }).catch((error: unknown) => notify(error instanceof Error ? error.message : 'Could not preview the saved portrait.'));
  });
  elements.stage.addEventListener('wheel', (event) => {
    event.preventDefault();
    setZoom(model.zoom + (event.deltaY < 0 ? 0.12 : -0.12));
  }, { passive: false });
  $('zoom-in').addEventListener('click', () => setZoom(model.zoom + 0.15));
  $('zoom-out').addEventListener('click', () => setZoom(model.zoom - 0.15));
  $('zoom-fit').addEventListener('click', fitArtboard);
  elements.zoomSlider.addEventListener('input', () => setZoom(Number(elements.zoomSlider.value) / 100));
  elements.comparePhoto.addEventListener('click', () => {
    model.showOriginal = !model.showOriginal;
    elements.originalPhoto.hidden = !model.showOriginal;
    elements.comparePhoto.classList.toggle('is-selected', model.showOriginal);
    elements.comparePhoto.textContent = model.showOriginal ? 'Showing photo' : 'Compare photo';
  });

  $('download-svg').addEventListener('click', downloadSvg);
  $('copy-svg').addEventListener('click', () => void copySvg());
  $('admin-open').addEventListener('click', openAdminGate);
  window.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      openAdminGate();
    }
  });
  $('pin-submit').addEventListener('click', submitPin);
  elements.pinInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') submitPin();
  });
  $('pin-clear').addEventListener('click', () => {
    elements.pinInput.value = '';
    elements.pinError.classList.add('is-hidden');
  });
  document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach((button) => {
    button.addEventListener('click', () => {
      if (elements.pinInput.value.length < 16) elements.pinInput.value += button.dataset.key;
      elements.pinError.classList.add('is-hidden');
    });
  });
  document.querySelectorAll<HTMLButtonElement>('[data-close]').forEach((button) => {
    button.addEventListener('click', () => {
      const dialog = $(button.dataset.close ?? '');
      if (dialog instanceof HTMLDialogElement) dialog.close();
    });
  });
  $('apply-settings').addEventListener('click', applyAdminSettings);

  $('setting-theme').addEventListener('change', () => {
    model.config.activeThemeId = ($('setting-theme') as HTMLSelectElement).value;
    model.clusterToTheme = [];
    persistSettings();
    renderAdminSettings();
    applyWorkspaceSettings();
  });
  $('add-color').addEventListener('click', () => {
    const theme = getActiveTheme(model.config);
    const choices = ['#56CCF2', '#EB5757', '#F2C94C', '#9B51E0', '#2F80ED', '#6FCF97'];
    theme.colors.push(choices[theme.colors.length % choices.length]);
    persistSettings();
    renderAdminSettings();
    applyWorkspaceSettings();
  });
  $('new-theme').addEventListener('click', () => {
    const theme: BrandTheme = {
      id: `palette-${Date.now().toString(36)}`,
      name: `Brand palette ${model.config.themes.length + 1}`,
      colors: ['#F2C94C', '#56CCF2', '#EB5757', '#2F80ED'],
    };
    model.config.themes.push(theme);
    model.config.activeThemeId = theme.id;
    model.clusterToTheme = [];
    persistSettings();
    renderAdminSettings();
    applyWorkspaceSettings();
  });
  $('delete-theme').addEventListener('click', () => {
    if (model.config.themes.length <= 1) {
      notify('Keep at least one brand palette.');
      return;
    }
    model.config.themes = model.config.themes.filter((theme) => theme.id !== model.config.activeThemeId);
    model.config.activeThemeId = model.config.themes[0].id;
    persistSettings();
    renderAdminSettings();
    applyWorkspaceSettings();
  });

  bindRange($('setting-dark-cutoff') as HTMLInputElement, $('dark-cutoff-value'), (value) => {
    model.config.darkCutoffPercent = value;
  });
  bindRange($('setting-light-cutoff') as HTMLInputElement, $('light-cutoff-value'), (value) => {
    model.config.lightCutoffPercent = value;
  });
  window.addEventListener('resize', fitArtboard);
  window.addEventListener('pagehide', () => {
    closeCamera();
    if (model.liveCameraActive) stopLiveCamera(false);
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('drawer-open')) {
      setDrawerOpen(false);
    }
  });
}

async function initialize(): Promise<void> {
  bindEvents();
  try {
    await loadBrandAssets();
  } catch (error) {
    console.error('Saved brand assets could not be restored.', error);
    notify(error instanceof Error ? error.message : 'Saved brand assets could not be restored.');
  }
  try {
    await refreshGallery();
  } catch (error) {
    console.error('The local portrait gallery is unavailable.', error);
    notify(error instanceof Error ? error.message : 'Local portrait storage is unavailable.');
  }
  elements.subjectThresholdValue.textContent = `${model.subjectThreshold}%`;
  elements.subjectContrastValue.textContent = `${model.subjectContrast}%`;
  elements.backgroundDensityValue.textContent = `${model.backgroundDensity}%`;
  elements.backgroundScatterValue.textContent = `${model.backgroundScatter}%`;
  elements.messageScaleValue.textContent = `${model.messageScale}%`;
  elements.messageText.value = model.message;
  elements.freeColorCountValue.textContent = String(model.freeColorCount);
  elements.includeBackground.checked = model.includeBackground;
  elements.subjectEnabled.checked = model.subjectEnabled;
  elements.messageEnabled.checked = model.messageEnabled;
  elements.showBadge.checked = model.showBadge;
  model.messagePosition = model.config.messagePosition;
  applyWorkspaceSettings();
  setBackground('black');
  setTool('pan');
  updateLiveUi();
}

void initialize().catch((error: unknown) => {
  console.error('Studio initialization failed.', error);
  notify(error instanceof Error ? error.message : 'The studio could not be started.');
});
