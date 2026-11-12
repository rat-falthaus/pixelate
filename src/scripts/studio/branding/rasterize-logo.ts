import { readBlobAsDataUrl } from "./read-blob-as-data-url";

/** Decode a logo into a size-limited PNG, releasing its temporary object URL afterward. */
export async function rasterizeLogo(
  blob: Blob,
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("The logo could not be decoded."));
      image.src = objectUrl;
    });
    const scale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser could not prepare the logo image.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const raster = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) =>
          result ? resolve(result) : reject(new Error("The logo image could not be prepared.")),
        "image/png",
      );
    });
    return {
      blob: raster,
      dataUrl: await readBlobAsDataUrl(raster),
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
