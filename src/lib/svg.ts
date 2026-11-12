import { escapeXml, seededRandom } from './color';
import type {
  ArtworkOptions,
  BackgroundMode,
  MessagePosition,
  PhotoCell,
  TileOverride,
} from './types';

interface GridBox {
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

export function createArtworkSvg(options: ArtworkOptions): SvgResult {
  const {
    grid, tileSize, theme, enforceTheme, clusterToTheme, manualTileOverrides,
    background, includeBackground, hairlines, backgroundScatter, randomSeed,
    messageEnabled, message, messagePosition, messageOrigin, messageScale, brandSignature, showBadge,
    logoDataUrl, logoAspectRatio, logoPosition, logoOrigin, fontFamily, fontDataUri,
  } = options;
  const width = grid.cols * tileSize;
  const height = grid.rows * tileSize;
  const messageBox = messageEnabled ? calculateMessageBox(
    grid.cols, grid.rows, tileSize, message, messagePosition, messageScale, messageOrigin,
  ) : null;
  const logoBox = logoDataUrl
    ? calculateLogoBox(grid.cols, grid.rows, logoPosition, logoOrigin, logoAspectRatio)
    : null;
  const badgeBox = messageBox && showBadge && brandSignature.trim()
    ? calculateBadgeBox(messageBox, grid.cols, grid.rows)
    : null;
  const pathsByColor = new Map<string, string[]>();
  const occupied = new Set<string>();
  const gap = hairlines && tileSize >= 8 ? 0.5 : 0;
  const drawnTileSize = Number((tileSize - gap * 2).toFixed(2));
  const random = seededRandom(randomSeed + 991);
  let tileCount = 0;

  for (const cell of grid.cells) {
    const key = cellKey(cell.col, cell.row);
    occupied.add(key);
    if (isInBox(cell.col, cell.row, messageBox)
      || isInBox(cell.col, cell.row, badgeBox)
      || isInBox(cell.col, cell.row, logoBox)) continue;

    let color: TileOverride | undefined = manualTileOverrides.get(key);
    if (color === 'ERASE') continue;
    if (typeof color !== 'string') {
      if (enforceTheme) {
        const paletteIndex = !cell.isSubject && random() < backgroundScatter / 100
          ? Math.floor(random() * theme.colors.length)
          : (clusterToTheme[cell.clusterIndex] ?? 0) % theme.colors.length;
        color = theme.colors[paletteIndex] ?? theme.colors[0];
      } else {
        color = grid.clusters[cell.clusterIndex]?.hex ?? theme.colors[0];
      }
    }
    if (color) addTilePath(pathsByColor, color, cell.col, cell.row, tileSize, gap, drawnTileSize);
  }

  for (const [key, color] of manualTileOverrides) {
    if (occupied.has(key) || color === 'ERASE') continue;
    const [col, row] = key.split(',').map(Number);
    if (!Number.isInteger(col) || !Number.isInteger(row)) continue;
    if (col < 0 || col >= grid.cols || row < 0 || row >= grid.rows) continue;
    if (isInBox(col, row, messageBox) || isInBox(col, row, badgeBox) || isInBox(col, row, logoBox)) continue;
    addTilePath(pathsByColor, color, col, row, tileSize, gap, drawnTileSize);
  }

  const pathMarkup: string[] = [];
  if (includeBackground && (background === 'black' || background === 'white')) {
    const color = background === 'black' ? '#080A09' : '#FFFFFF';
    pathMarkup.push(`<path id="canvas-background" fill="${color}" d="M0 0h${width}v${height}h-${width}Z"/>`);
  }

  let colorPathIndex = 0;
  for (const [color, commands] of pathsByColor) {
    if (!commands.length) continue;
    colorPathIndex += 1;
    tileCount += commands.length;
    pathMarkup.push(`<path id="tile-color-${colorPathIndex}" fill="${color}" d="${commands.join('')}"/>`);
  }

  const overlays = renderMessageAndBadge(
    messageBox,
    badgeBox,
    tileSize,
    background,
    message,
    brandSignature,
    fontFamily,
  );
  if (logoBox && logoDataUrl) {
    overlays.push(renderLogo(logoBox, tileSize, logoDataUrl));
  }
  if (fontDataUri && fontFamily === 'BrandUploaded') {
    overlays.unshift(
      `<defs><style>@font-face{font-family:BrandUploaded;src:url('${escapeXml(fontDataUri)}')}#message-overlay text,#brand-signature text{font-family:BrandUploaded,Arial,sans-serif}</style></defs>`,
    );
  }
  const description = `Square mosaic with ${tileCount} tiles and ${colorPathIndex} palette paths.`;
  const markup = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="artwork-title artwork-description">`,
    `<title id="artwork-title">${escapeXml(brandSignature || 'Pixel mosaic')}</title>`,
    `<desc id="artwork-description">${description}</desc>`,
    ...pathMarkup,
    ...overlays,
    '</svg>',
  ].join('\n');

  return {
    markup,
    tileCount,
    pathCount: colorPathIndex,
    byteCount: new TextEncoder().encode(markup).byteLength,
  };
}

function addTilePath(
  pathsByColor: Map<string, string[]>,
  color: string,
  col: number,
  row: number,
  tileSize: number,
  gap: number,
  drawSize: number,
): void {
  const x = Number((col * tileSize + gap).toFixed(2));
  const y = Number((row * tileSize + gap).toFixed(2));
  const command = `M${x} ${y}h${drawSize}v${drawSize}h-${drawSize}Z`;
  const commands = pathsByColor.get(color) ?? [];
  commands.push(command);
  pathsByColor.set(color, commands);
}

function calculateMessageBox(
  cols: number,
  rows: number,
  tileSize: number,
  message: string,
  position: MessagePosition,
  scale: number,
  origin: { col: number; row: number } | null,
): GridBox {
  const lines = message.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const safeLines = lines.length ? lines : [' '];
  const baseFont = Math.max(10, Math.round((cols * tileSize / 14.5) * (scale / 100)));
  const longestLine = Math.max(...safeLines.map((line) => line.length));
  const estimatedWidth = longestLine * baseFont * 0.72 + tileSize * 1.3;
  const lineHeight = baseFont * 1.16;
  const estimatedHeight = safeLines.length * lineHeight + tileSize * 0.75;
  const boxCols = Math.min(cols, Math.max(4, Math.ceil(estimatedWidth / tileSize)));
  const boxRows = Math.min(rows, Math.max(2, Math.ceil(estimatedHeight / tileSize)));
  let { col, row } = calculateOverlayOrigin(cols, rows, boxCols, boxRows, position, 2);
  if (origin) { col = origin.col; row = origin.row; }

  return {
    col: Math.max(0, Math.min(cols - boxCols, col)),
    row: Math.max(0, Math.min(rows - boxRows, row)),
    cols: boxCols,
    rows: boxRows,
    lines: safeLines,
    fontSize: baseFont,
    lineHeight,
  };
}

function calculateLogoBox(
  cols: number,
  rows: number,
  position: MessagePosition,
  origin: { col: number; row: number } | null,
  aspectRatio: number,
): GridBox {
  const logoCols = Math.min(cols, Math.max(2, Math.floor(cols * 0.18)));
  const logoRows = Math.min(rows, Math.max(2, Math.ceil(logoCols / Math.max(0.1, aspectRatio))));
  const anchor = calculateOverlayOrigin(cols, rows, logoCols, logoRows, position, 2);
  return {
    col: origin ? Math.max(0, Math.min(cols - logoCols, origin.col)) : anchor.col,
    row: origin ? Math.max(0, Math.min(rows - logoRows, origin.row)) : anchor.row,
    cols: logoCols,
    rows: logoRows,
    lines: [],
    fontSize: 0,
    lineHeight: 0,
  };
}

function calculateOverlayOrigin(
  cols: number,
  rows: number,
  boxCols: number,
  boxRows: number,
  position: MessagePosition,
  margin: number,
): { col: number; row: number } {
  const isLeft = position === 'topleft' || position === 'bottomleft' || position === 'middleleft';
  const isRight = position === 'topright' || position === 'bottomright' || position === 'middleright';
  const isTop = position === 'upper' || position === 'topleft' || position === 'topright';
  const isBottom = position === 'lower' || position === 'bottomleft' || position === 'bottomright';
  const col = isLeft
    ? margin
    : isRight ? cols - boxCols - margin : Math.floor((cols - boxCols) / 2);
  const row = isTop
    ? Math.max(margin, Math.floor(rows * 0.18))
    : isBottom ? rows - boxRows - margin : Math.floor((rows - boxRows) / 2);
  return {
    col: Math.max(0, Math.min(cols - boxCols, col)),
    row: Math.max(0, Math.min(rows - boxRows, row)),
  };
}

function calculateBadgeBox(messageBox: GridBox, cols: number, rows: number): GridBox {
  const badgeCols = Math.min(cols, Math.max(4, Math.round(messageBox.cols * 0.44)));
  const badgeRows = Math.min(rows, 2);
  return {
    col: Math.max(0, Math.min(cols - badgeCols, messageBox.col + messageBox.cols - badgeCols)),
    row: Math.max(0, Math.min(rows - badgeRows, messageBox.row + messageBox.rows)),
    cols: badgeCols,
    rows: badgeRows,
    lines: [],
    fontSize: 0,
    lineHeight: 0,
  };
}

function renderMessageAndBadge(
  messageBox: GridBox | null,
  badgeBox: GridBox | null,
  tileSize: number,
  background: BackgroundMode,
  message: string,
  brandSignature: string,
  fontFamily: string,
): string[] {
  if (!messageBox) return [];
  const backgroundColor = background === 'white' ? '#FFFFFF' : '#080A09';
  const foregroundColor = background === 'white' ? '#080A09' : '#FFFFFF';
  const messageX = messageBox.col * tileSize;
  const messageY = messageBox.row * tileSize;
  const messageWidth = messageBox.cols * tileSize;
  const messageHeight = messageBox.rows * tileSize;
  const elements = ['<g id="message-overlay" data-draggable="message">'];

  if (background !== 'transparent') {
    elements.push(`<rect x="${messageX}" y="${messageY}" width="${messageWidth}" height="${messageHeight}" fill="${backgroundColor}"/>`);
  }
  const firstBaseline = messageY + Math.round(tileSize * 0.48) + messageBox.fontSize * 0.82;
  messageBox.lines.forEach((line, index) => {
    const baseline = Number((firstBaseline + index * messageBox.lineHeight).toFixed(2));
    elements.push(
      `<text x="${messageX + Math.round(tileSize * 0.65)}" y="${baseline}" fill="${foregroundColor}" font-family="${escapeXml(fontFamily)}" font-size="${messageBox.fontSize}" font-weight="800" letter-spacing="0.015em">${escapeXml(line)}</text>`,
    );
  });
  elements.push('</g>');

  if (badgeBox && brandSignature.trim()) {
    const x = badgeBox.col * tileSize;
    const y = badgeBox.row * tileSize;
    const width = badgeBox.cols * tileSize;
    const height = badgeBox.rows * tileSize;
    if (background !== 'transparent') {
      elements.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${backgroundColor}"/>`);
    }
    const iconSize = Math.round(height * 0.56);
    const iconX = x + Math.round(tileSize * 0.35);
    const iconY = y + Math.round((height - iconSize) / 2);
    const fontSize = Math.max(10, Math.round(iconSize * 0.68));
    elements.push(`<g id="brand-signature" fill="${foregroundColor}">`);
    elements.push(`<path d="M${iconX} ${iconY}h${iconSize * 0.48}v${iconSize * 0.48}h-${iconSize * 0.48}zM${iconX + iconSize * 0.52} ${iconY}h${iconSize * 0.48}v${iconSize * 0.48}h-${iconSize * 0.48}zM${iconX} ${iconY + iconSize * 0.52}h${iconSize * 0.48}v${iconSize * 0.48}h-${iconSize * 0.48}z"/>`);
    elements.push(`<text x="${iconX + iconSize + tileSize * 0.35}" y="${y + height * 0.58}" font-family="${escapeXml(fontFamily)}" font-size="${fontSize}" font-weight="800">${escapeXml(brandSignature.trim())}</text>`);
    elements.push('</g>');
  }
  return elements;
}

function renderLogo(box: GridBox, tileSize: number, dataUrl: string): string {
  return `<image data-draggable="logo" x="${box.col * tileSize}" y="${box.row * tileSize}" width="${box.cols * tileSize}" height="${box.rows * tileSize}" href="${escapeXml(dataUrl)}" preserveAspectRatio="xMidYMid meet"/>`;
}

function isInBox(col: number, row: number, box: GridBox | null): boolean {
  return !!box
    && col >= box.col && col < box.col + box.cols
    && row >= box.row && row < box.row + box.rows;
}

function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}
