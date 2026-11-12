import { stopLiveCamera } from '../camera/stop-live-camera';
import { model } from '../state/model';
import { setImageSource } from './set-image-source';
import { analyzePhotoSubjects } from '../recognition/analyze-photo-subjects';

/**
 * Decode and validate a source image before replacing the current artwork.
 * @param source Browser-readable image URL.
 * @param fileName Display and export filename.
 * @param sourceUrl Optional preview URL whose ownership passes to the studio on success.
 */
export async function loadImage(
  source: string,
  fileName: string,
  sourceUrl?: string,
): Promise<void> {
  if (model.liveCameraActive) stopLiveCamera(false);
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () =>
      reject(new Error('This image could not be decoded. Try a PNG, JPEG, WebP, or GIF image.'));
    image.src = source;
  });
  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error('The selected image has no readable pixels.');
  }
  if (image.naturalWidth * image.naturalHeight > 40_000_000) {
    throw new Error('This image is larger than 40 megapixels. Choose a smaller image.');
  }
  model.subjectMask = null;
  setImageSource(image, fileName, sourceUrl ?? source);
  void analyzePhotoSubjects(image);
}
