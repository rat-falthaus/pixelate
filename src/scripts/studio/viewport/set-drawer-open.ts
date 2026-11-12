import { getElement } from '../dom/get-element';

/** Toggle the adjustment drawer and its accessible expanded state. */
export function setDrawerOpen(open: boolean): void {
  document.body.classList.toggle('drawer-open', open);
  getElement('drawer-open').setAttribute('aria-expanded', String(open));
}
