import { getActiveTheme } from '../../../lib/config';
import { model } from '../state/model';
import { notify } from '../ui/notify';

/** Download the standalone SVG with the active palette and tile size in its filename. */
export function downloadSvg(): void {
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
