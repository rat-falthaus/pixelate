import { isAllowedPaletteColor } from '../../../lib/color';
import { getActiveTheme } from '../../../lib/config';
import { renderArtwork } from '../artwork/render-artwork';
import { renderMapping } from '../artwork/render-mapping';
import { getElement } from '../dom/get-element';
import { model } from '../state/model';
import { applyWorkspaceSettings } from '../ui/apply-workspace-settings';
import { notify } from '../ui/notify';
import { persistSettings } from './persist-settings';
import { renderAdminSettings } from './render-admin-settings';

/** Build editable palette rows with validated color updates and removal actions. */
export function renderThemeColors(): void {
  const theme = getActiveTheme(model.config);
  const container = getElement('theme-colors');
  container.replaceChildren();
  theme.colors.forEach((color, index) => {
    const row = document.createElement('div');
    row.className = 'theme-color-row';
    const picker = document.createElement('input');
    picker.type = 'color';
    picker.value = color;
    picker.setAttribute('aria-label', `Choose brand color ${index + 1}`);
    const text = document.createElement('input');
    text.type = 'text';
    text.value = color;
    text.maxLength = 7;
    text.className = 'text-input color-text-input';
    text.setAttribute('aria-label', `Hex value for brand color ${index + 1}`);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'text-button remove-color';
    remove.textContent = 'Remove';
    remove.disabled = theme.colors.length <= 2;
    const updateColor = (value: string) => {
      const normalized = value.startsWith('#') ? value.toUpperCase() : `#${value.toUpperCase()}`;
      if (!isAllowedPaletteColor(normalized)) {
        notify('Use a valid color that is not near black or white.');
        text.value = theme.colors[index];
        picker.value = theme.colors[index];
        return;
      }
      theme.colors[index] = normalized;
      text.value = normalized;
      picker.value = normalized;
      persistSettings();
      renderMapping();
      renderArtwork();
    };
    picker.addEventListener('input', () => updateColor(picker.value));
    text.addEventListener('change', () => updateColor(text.value));
    remove.addEventListener('click', () => {
      if (theme.colors.length <= 2) return;
      theme.colors.splice(index, 1);
      persistSettings();
      renderAdminSettings();
      applyWorkspaceSettings();
    });
    row.append(picker, text, remove);
    container.append(row);
  });
}
