import { model } from '../state/model';

/** Rasterize the current standalone SVG to PNG, limiting its longest edge to 4096 pixels. */
export async function createPngBlob(): Promise<Blob> {
  if (!model.image || !model.currentSvg) throw new Error('There is no artwork to export yet.');
  const image = new Image();
  const svgUrl = URL.createObjectURL(
    new Blob([model.currentSvg], { type: 'image/svg+xml;charset=utf-8' }),
  );
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('The SVG could not be prepared as an image.'));
      image.src = svgUrl;
    });
    const scale = Math.min(
      1,
      4096 / Math.max(model.gridCols * model.tileSize, model.gridRows * model.tileSize),
    );
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(model.gridCols * model.tileSize * scale));
    canvas.height = Math.max(1, Math.round(model.gridRows * model.tileSize * scale));
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
