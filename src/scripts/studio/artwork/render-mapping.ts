import { getActiveTheme } from '../../../lib/config';
import { elements } from '../dom/elements';
import { model } from '../state/model';
import { renderArtwork } from './render-artwork';
import { renderBrushSwatches } from './render-brush-swatches';

/** Rebuild photo-tone mapping controls and refresh the available paint swatches. */
export function renderMapping(): void {
  const theme = getActiveTheme(model.config);
  elements.paletteCount.textContent = model.config.enforceTheme
    ? `${theme.colors.length} colors`
    : `${model.freeColorCount} free`;
  elements.mappingList.replaceChildren();
  elements.mappingControls.classList.toggle('is-hidden', !model.config.enforceTheme);
  elements.freePaletteControls.classList.toggle(
    'is-hidden',
    model.config.enforceTheme || model.config.fairMode,
  );

  if (model.config.enforceTheme) {
    model.clusters.forEach((cluster, clusterIndex) => {
      const paletteIndex = model.clusterToTheme[clusterIndex] ?? 0;
      const assigned = theme.colors[paletteIndex] ?? theme.colors[0];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mapping-item';
      button.title = `Change ${cluster.hex} to another brand color`;
      button.setAttribute(
        'aria-label',
        `Photo tone ${cluster.hex} maps to ${assigned}. Change color.`,
      );

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
