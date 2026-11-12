import { model } from '../state/model';

/** Request fullscreen only for fair mode; callers provide feedback when it is unavailable. */
export async function requestLiveFullscreen(): Promise<boolean> {
  if (!model.config.fairMode) return false;
  if (document.fullscreenElement) return true;
  if (!document.documentElement.requestFullscreen) return false;
  try {
    await document.documentElement.requestFullscreen();
    return true;
  } catch {
    return false;
  }
}
