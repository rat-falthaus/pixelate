import { runtime } from '../state/runtime';

/** Release thumbnail URLs before replacing the gallery DOM. */
export function revokeGalleryObjectUrls(): void {
  runtime.galleryObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  runtime.galleryObjectUrls = [];
}
