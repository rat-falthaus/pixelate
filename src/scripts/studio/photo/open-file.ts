import { notify } from '../ui/notify';
import { loadImage } from './load-image';

/** Validate a local photo upload, take ownership of its URL, and report decoding failures. */
export async function openFile(file: File): Promise<void> {
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
