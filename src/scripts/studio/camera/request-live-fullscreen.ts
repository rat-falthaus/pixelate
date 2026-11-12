import { isKioskMode } from "../state/is-kiosk-mode";

/** Request fullscreen only for fair mode; callers provide feedback when it is unavailable. */
export async function requestLiveFullscreen(): Promise<boolean> {
  if (!isKioskMode()) return false;
  if (document.fullscreenElement) return true;
  if (!document.documentElement.requestFullscreen) return false;
  try {
    await document.documentElement.requestFullscreen();
    if (!isKioskMode()) {
      await document.exitFullscreen();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
