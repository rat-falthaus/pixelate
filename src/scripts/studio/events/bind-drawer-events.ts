import { elements } from '../dom/elements';
import { getElement } from '../dom/get-element';
import { setDrawerOpen } from '../viewport/set-drawer-open';

/** Connect drawer open, close, and backdrop dismissal controls. */
export function bindDrawerEvents(): void {
  getElement('drawer-open').addEventListener('click', () => setDrawerOpen(true));
  getElement('drawer-close').addEventListener('click', () => setDrawerOpen(false));
  elements.drawerBackdrop.addEventListener('click', () => setDrawerOpen(false));
}
