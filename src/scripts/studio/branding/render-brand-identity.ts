import { getElement } from '../dom/get-element';
import { model } from '../state/model';

/** Show the uploaded logo instead of typed identity, with the same fallback in both toolbars. */
export function renderBrandIdentity(): void {
  const signature = model.config.brandSignature;
  for (const [textId, logoId] of [
    ['brand-title', 'brand-logo'],
    ['live-brand-title', 'live-brand-logo'],
    ['live-prompt-brand', 'live-prompt-logo'],
  ]) {
    const text = getElement(textId);
    const logo = getElement(logoId) as HTMLImageElement;
    text.textContent = signature;
    text.classList.toggle('is-hidden', Boolean(model.logoDataUrl));
    logo.classList.toggle('is-hidden', !model.logoDataUrl);
    if (model.logoDataUrl) {
      logo.src = model.logoDataUrl;
      logo.alt = signature || 'Brand logo';
    } else {
      logo.removeAttribute('src');
    }
  }
  document.querySelector('.brand-mark')?.classList.toggle('is-hidden', Boolean(model.logoDataUrl));
}
