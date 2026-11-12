import { elements } from '../dom/elements';
import { model } from '../state/model';
import { notify } from '../ui/notify';
import { createPngBlob } from './create-png-blob';

/** Prepare a PNG for native file sharing and distinguish cancellation from failure. */
export async function sharePngWithDevice(): Promise<void> {
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
