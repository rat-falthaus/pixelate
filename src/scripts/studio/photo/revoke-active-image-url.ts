import { runtime } from '../state/runtime';

/** Release the object URL owned by the current source-image preview. */
export function revokeActiveImageUrl(): void {
  if (runtime.activeImageUrl) URL.revokeObjectURL(runtime.activeImageUrl);
  runtime.activeImageUrl = null;
}
