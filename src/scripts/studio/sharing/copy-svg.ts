import { model } from '../state/model';
import { notify } from '../ui/notify';
import { getExportSnapshot } from './get-export-snapshot';

/** Copy the current SVG using the Clipboard API or the legacy text-selection fallback. */
export async function copySvg(): Promise<void> {
  if (!model.image || !model.currentSvg) {
    notify('Take a photo or choose one before copying the SVG.');
    return;
  }
  try {
    const snapshot = getExportSnapshot(true);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(snapshot.svg);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = snapshot.svg;
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
