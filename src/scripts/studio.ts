import { getActiveTheme, loadConfig, saveConfig } from '../lib/config';
import { isAllowedPaletteColor } from '../lib/color';
import { mapClustersToTheme, sampleImage } from '../lib/sampling';
import { createArtworkSvg } from '../lib/svg';
import type {
  AppModel,
  BackgroundMode,
  BrandTheme,
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
  messagePosition: 'upper',
  messageOrigin: null,
  messageScale: 100,
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
};

const elements = {
  brandTitle: $('brand-title'),
  modeLabel: $('mode-label'),
  fileInput: $('photo-input') as HTMLInputElement,
  dropZone: $('drop-zone'),
  sourceThumb: $('source-thumb') as HTMLImageElement,
  fileName: $('file-name'),
  sourceDimensions: $('source-dimensions'),
  sampleSelect: $('sample-select') as HTMLSelectElement,
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
  toast: $('toast'),
};

let activeImageUrl: string | null = null;
let cameraStream: MediaStream | null = null;
let toastTimer = 0;
let processFrame = 0;
let pointerStart: { x: number; y: number; panX: number; panY: number } | null = null;
let messageDragOffset = { col: 0, row: 0 };
let painting = false;
let pendingSubjectEdit = false;

function notify(message: string): void {
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => elements.toast.classList.remove('is-visible'), 2600);
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
  const theme = getActiveTheme(model.config);
  elements.brandTitle.textContent = model.config.applicationTitle;
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
  renderMapping();
  rebuildArtwork();
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
  model.zoom = Math.max(0.15, Math.min(2.5, (Math.min(stage.width, stage.height) - 72) / Math.max(width, height)));
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

async function loadImage(source: string, fileName: string, sourceUrl?: string): Promise<void> {
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
  revokeActiveImageUrl();
  activeImageUrl = sourceUrl ?? source;
  model.image = image;
  model.fileName = fileName.replace(/\.[^.]+$/, '') || 'pixel-artwork';
  model.manualSubjectMask.clear();
  model.manualTileOverrides.clear();
  model.tileUndoStack = [];
  model.messageOrigin = null;
  model.showOriginal = false;
  elements.fileName.textContent = fileName;
  elements.sourceDimensions.textContent = `${image.naturalWidth} × ${image.naturalHeight}`;
  elements.sourceThumb.src = source;
  elements.originalPhoto.src = source;
  elements.originalPhoto.hidden = true;
  elements.comparePhoto.textContent = 'Compare photo';
  $('reset-mask').classList.add('is-hidden');
  renderUndoControls();
  rebuildArtwork(true);
}

function drawSample(name: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser could not create the sample artwork.');
  canvas.width = name === 'architecture' ? 540 : 600;
  canvas.height = name === 'architecture' ? 780 : 600;

  if (name === 'architecture') {
    const sky = context.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, '#18395B');
    sky.addColorStop(0.55, '#2584A9');
    sky.addColorStop(1, '#101B27');
    context.fillStyle = sky;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#F2C94C';
    context.fillRect(42, 42, 110, 82);
    context.fillStyle = '#56CCF2';
    context.fillRect(220, 68, 128, 104);
    context.fillStyle = '#EB5757';
    context.fillRect(400, 40, 92, 82);
    context.fillStyle = '#111311';
    context.fillRect(0, 450, canvas.width, 330);
    context.fillStyle = '#F2C94C';
    context.fillRect(62, 564, 195, 137);
    context.fillStyle = '#2F80ED';
    context.beginPath();
    context.moveTo(50, 570); context.lineTo(142, 510); context.lineTo(268, 570);
    context.closePath(); context.fill();
    context.fillStyle = '#EB5757';
    for (let index = 0; index < 5; index += 1) {
      const x = 278 + index * 48;
      context.fillRect(x, 598, 42, 52);
      context.beginPath(); context.moveTo(x - 3, 598); context.lineTo(x + 21, 568); context.lineTo(x + 45, 598); context.fill();
    }
    context.fillStyle = '#F2994A';
    context.fillRect(260, 650, 265, 50);
    context.fillStyle = '#080A09';
    [78, 111, 152, 194, 300, 348, 396, 444].forEach((x) => context.fillRect(x, 610, 12, 42));
    context.fillStyle = '#2F80ED';
    context.fillRect(26, 720, 470, 40);
  } else if (name === 'portrait') {
    context.fillStyle = '#1C2A36';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const face = context.createRadialGradient(280, 240, 16, 300, 270, 210);
    face.addColorStop(0, '#F2C94C');
    face.addColorStop(0.42, '#F2994A');
    face.addColorStop(0.78, '#EB5757');
    face.addColorStop(1, '#2F80ED');
    context.fillStyle = face;
    context.beginPath();
    context.ellipse(300, 266, 145, 184, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#080A09';
    context.fillRect(222, 226, 58, 28);
    context.fillRect(320, 226, 58, 28);
    context.fillRect(280, 236, 40, 9);
    context.fillStyle = '#56CCF2';
    context.beginPath();
    context.roundRect(110, 455, 380, 185, [80, 80, 0, 0]);
    context.fill();
    context.fillStyle = '#9B51E0';
    context.fillRect(236, 455, 128, 145);
  } else {
    const sky = context.createLinearGradient(0, 0, 0, 480);
    sky.addColorStop(0, '#25214A');
    sky.addColorStop(0.45, '#9B51E0');
    sky.addColorStop(0.78, '#EB5757');
    sky.addColorStop(1, '#F2C94C');
    context.fillStyle = sky;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#F2C94C';
    context.beginPath(); context.arc(300, 275, 112, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#17242B';
    context.beginPath();
    context.moveTo(0, 440); context.lineTo(160, 280); context.lineTo(300, 408);
    context.lineTo(455, 240); context.lineTo(600, 400); context.lineTo(600, 600);
    context.lineTo(0, 600); context.closePath(); context.fill();
    context.fillStyle = '#2F80ED';
    context.fillRect(0, 506, 600, 94);
    context.fillStyle = '#56CCF2';
    context.fillRect(54, 530, 190, 18);
    context.fillRect(355, 566, 170, 14);
  }
  return canvas;
}

async function loadSample(name: string): Promise<void> {
  const canvas = drawSample(name);
  const imageData = canvas.toDataURL('image/png');
  await loadImage(imageData, `sample-${name}.png`);
  model.messageOrigin = null;
  model.messagePosition = name === 'architecture' ? 'upper' : 'lower';
  document.querySelectorAll<HTMLButtonElement>('[data-position]').forEach((button) => {
    button.classList.toggle('is-selected', button.dataset.position === model.messagePosition);
  });
  renderArtwork();
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
  model.messageOrigin = null;
  elements.messageText.value = defaultMessage;
  persistSettings();
  elements.adminDialog.close();
  applyWorkspaceSettings();
  notify('Brand and kiosk settings applied.');
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

function downloadSvg(): void {
  if (!model.currentSvg) return;
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
  if (!model.currentSvg) return;
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

function bindEvents(): void {
  $('upload-open').addEventListener('click', () => elements.fileInput.click());
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

  elements.sampleSelect.addEventListener('change', () => {
    void loadSample(elements.sampleSelect.value).catch((error: unknown) => {
      notify(error instanceof Error ? error.message : 'Could not create sample artwork.');
    });
  });
  $('camera-open').addEventListener('click', () => void openCamera());
  $('capture-photo').addEventListener('click', () => void capturePhoto());
  $('camera-dialog').addEventListener('close', closeCamera);

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
    if (messageTarget && model.messageEnabled && model.tool === 'pan') {
      const rect = elements.artboard.getBoundingClientRect();
      const pointerCol = Math.floor(((event.clientX - rect.left) / rect.width) * model.gridCols);
      const pointerRow = Math.floor(((event.clientY - rect.top) / rect.height) * model.gridRows);
      const origin = model.messageOrigin ?? { col: Math.floor(model.gridCols / 3), row: Math.floor(model.gridRows / 4) };
      messageDragOffset = { col: pointerCol - origin.col, row: pointerRow - origin.row };
      elements.stage.setPointerCapture(event.pointerId);
      elements.stage.dataset.draggingMessage = 'true';
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
  };
  elements.stage.addEventListener('pointerup', endPointer);
  elements.stage.addEventListener('pointercancel', endPointer);
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
}

async function initialize(): Promise<void> {
  bindEvents();
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
  applyWorkspaceSettings();
  setBackground('black');
  setTool('pan');
  await loadSample('architecture');
}

void initialize().catch((error: unknown) => {
  console.error('Studio initialization failed.', error);
  notify(error instanceof Error ? error.message : 'The studio could not be started.');
});
