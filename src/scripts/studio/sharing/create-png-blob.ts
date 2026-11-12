import type { ArtworkSnapshot } from '../../../lib/types';
import { getExportSnapshot } from './get-export-snapshot';

/** Rasterize the current standalone SVG to PNG, limiting its longest edge to 4096 pixels. */
export async function createPngBlob(
  snapshot: ArtworkSnapshot = getExportSnapshot(),
): Promise<Blob> {
  if (snapshot.pngBlob) return snapshot.pngBlob;
  const image = new Image();
  const svgUrl = URL.createObjectURL(
    new Blob([snapshot.svg], { type: 'image/svg+xml;charset=utf-8' }),
  );
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('The SVG could not be prepared as an image.'));
      image.src = svgUrl;
    });
    const scale = Math.min(1, 4096 / Math.max(snapshot.width, snapshot.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(snapshot.width * scale));
    canvas.height = Math.max(1, Math.round(snapshot.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser could not prepare the PNG image.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('The PNG image could not be created.'));
      }, 'image/png');
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
