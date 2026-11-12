import { escapeXml, seededRandom } from "../color";
import type { ArtworkOptions, TileOverride } from "../types";
import { addTilePath } from "./add-tile-path";
import { calculateLogoBox } from "./calculate-logo-box";
import { calculateMessageBox } from "./calculate-message-box";
import { cellKey } from "./cell-key";
import { isInBox } from "./is-in-box";
import { renderLogo } from "./render-logo";
import { renderBrandText } from "./render-brand-text";
import { renderMessage } from "./render-message";
import type { SvgResult } from "./types";

/**
 * Generate a standalone mosaic SVG with grid-aligned overlays and export statistics.
 * @param options Sampled cells, palette mappings, local brand assets, and overlay settings.
 * @returns SVG markup plus tile, color-path, and UTF-8 byte counts.
 */
export function createArtworkSvg(options: ArtworkOptions): SvgResult {
  const {
    grid,
    tileSize,
    theme,
    enforceTheme,
    clusterToTheme,
    manualTileOverrides,
    background,
    includeBackground,
    hairlines,
    backgroundScatter,
    randomSeed,
    messageEnabled,
    message,
    messagePosition,
    messageOrigin,
    messageScale,
    brandSignature,
    showBadge,
    logoDataUrl,
    logoAspectRatio,
    logoPosition,
    logoOrigin,
    fontFamily,
    fontDataUri,
  } = options;
  const width = grid.cols * tileSize;
  const height = grid.rows * tileSize;
  const messageBox = messageEnabled
    ? calculateMessageBox(
        grid.cols,
        grid.rows,
        tileSize,
        message,
        messagePosition,
        messageScale,
        messageOrigin,
      )
    : null;
  const logoBox =
    showBadge && (logoDataUrl || brandSignature.trim())
      ? calculateLogoBox(
          grid.cols,
          grid.rows,
          logoPosition,
          logoOrigin,
          logoDataUrl ? logoAspectRatio : 4,
        )
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
    if (isInBox(cell.col, cell.row, messageBox) || isInBox(cell.col, cell.row, logoBox)) continue;

    let color: TileOverride | undefined = manualTileOverrides.get(key);
    if (color === "ERASE") continue;
    if (typeof color !== "string") {
      if (enforceTheme) {
        const paletteIndex =
          !cell.isSubject && random() < backgroundScatter / 100
            ? Math.floor(random() * theme.colors.length)
            : (clusterToTheme[cell.clusterIndex] ?? 0) % theme.colors.length;
        color = theme.colors[paletteIndex] ?? theme.colors[0];
      } else {
        const clusterIndex =
          !cell.isSubject && random() < backgroundScatter / 100
            ? Math.floor(random() * grid.clusters.length)
            : cell.clusterIndex;
        color = grid.clusters[clusterIndex]?.hex ?? theme.colors[0];
      }
    }
    if (color) addTilePath(pathsByColor, color, cell.col, cell.row, tileSize, gap, drawnTileSize);
  }

  for (const [key, color] of manualTileOverrides) {
    if (occupied.has(key) || color === "ERASE") continue;
    const [col, row] = key.split(",").map(Number);
    if (!Number.isInteger(col) || !Number.isInteger(row)) continue;
    if (col < 0 || col >= grid.cols || row < 0 || row >= grid.rows) continue;
    if (isInBox(col, row, messageBox) || isInBox(col, row, logoBox)) continue;
    addTilePath(pathsByColor, color, col, row, tileSize, gap, drawnTileSize);
  }

  const pathMarkup: string[] = [];
  if (includeBackground && (background === "black" || background === "white")) {
    const color = background === "black" ? "#080A09" : "#FFFFFF";
    pathMarkup.push(
      `<path id="canvas-background" fill="${color}" d="M0 0h${width}v${height}h-${width}Z"/>`,
    );
  }

  let colorPathIndex = 0;
  for (const [color, commands] of pathsByColor) {
    if (!commands.length) continue;
    colorPathIndex += 1;
    tileCount += commands.length;
    pathMarkup.push(
      `<path id="tile-color-${colorPathIndex}" fill="${color}" d="${commands.join("")}"/>`,
    );
  }

  const overlays = renderMessage(messageBox, tileSize, background, message, fontFamily);
  if (logoBox && logoDataUrl) {
    overlays.push(renderLogo(logoBox, tileSize, logoDataUrl));
  } else if (logoBox) {
    overlays.push(
      renderBrandText(logoBox, tileSize, brandSignature.trim(), background, fontFamily),
    );
  }
  if (fontDataUri && fontFamily === "BrandUploaded") {
    overlays.unshift(
      `<defs><style>@font-face{font-family:BrandUploaded;src:url('${escapeXml(fontDataUri)}')}#message-overlay text,#brand-signature text{font-family:BrandUploaded,Arial,sans-serif}</style></defs>`,
    );
  }
  const description = `Square mosaic with ${tileCount} tiles and ${colorPathIndex} palette paths.`;
  const markup = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="artwork-title artwork-description">`,
    `<title id="artwork-title">${escapeXml(brandSignature || "Pixel mosaic")}</title>`,
    `<desc id="artwork-description">${description}</desc>`,
    ...pathMarkup,
    ...overlays,
    "</svg>",
  ].join("\n");

  return {
    markup,
    tileCount,
    pathCount: colorPathIndex,
    byteCount: new TextEncoder().encode(markup).byteLength,
  };
}
