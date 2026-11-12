import { getActiveTheme } from '../../../lib/config';
import { createArtworkSvg } from '../../../lib/svg';
import { elements } from '../dom/elements';
import { getElement } from '../dom/get-element';
import { model } from '../state/model';
import { renderUndoControls } from '../ui/render-undo-controls';
import { updateViewportTransform } from '../viewport/update-viewport-transform';

/** Generate the current SVG, replace the preview, and update export statistics. */
export function renderArtwork(): void {
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
  getElement('stat-tiles').textContent = result.tileCount.toLocaleString();
  getElement('stat-paths').textContent = result.pathCount.toLocaleString();
  getElement('stat-size').textContent = `${Math.max(1, Math.round(result.byteCount / 1024))} KB`;
  renderUndoControls();
  updateViewportTransform();
}
