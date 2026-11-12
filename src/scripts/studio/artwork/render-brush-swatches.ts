import { getActiveTheme } from '../../../lib/config';
import { elements } from '../dom/elements';
import { model } from '../state/model';
import { setTool } from './set-tool';

/** Render palette and erase brushes while keeping the selected brush valid. */
export function renderBrushSwatches(): void {
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
