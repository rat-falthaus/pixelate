import { getElement } from "../dom/get-element";
import { model } from "../state/model";
import { runtime } from "../state/runtime";

/** Reflect native fullscreen state, including exits through Escape or browser controls. */
export function updateFullscreenUi(): void {
  const active = Boolean(document.fullscreenElement);
  for (const id of ["studio-fullscreen", "live-fullscreen"]) {
    getElement(`${id}-label`).textContent = active ? "Exit fullscreen" : "Fullscreen";
    getElement(id).setAttribute("aria-pressed", String(active));
    getElement(id).setAttribute("aria-label", active ? "Exit fullscreen" : "Fullscreen");
  }
  getElement("live-fullscreen").classList.toggle("is-hidden", active && model.config.fairMode);
  getElement("live-leave-kiosk").classList.toggle(
    "is-hidden",
    !runtime.publicKioskMode || model.config.fairMode,
  );
  getElement("studio-kiosk").setAttribute("aria-pressed", String(runtime.publicKioskMode));
}
