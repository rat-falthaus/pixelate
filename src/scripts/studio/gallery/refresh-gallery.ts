import { listGalleryFreezes } from '../../../lib/local-store';
import { elements } from '../dom/elements';
import { getElement } from '../dom/get-element';
import { runtime } from '../state/runtime';
import { previewGalleryFreeze } from './preview-gallery-freeze';
import { revokeGalleryObjectUrls } from './revoke-gallery-object-urls';
import { updateGallerySelection } from './update-gallery-selection';

/** Reload saved portraits and rebuild selectable, draggable gallery cards. */
export async function refreshGallery(): Promise<void> {
  const freezes = await listGalleryFreezes();
  const grid = getElement('gallery-grid');
  revokeGalleryObjectUrls();
  grid.replaceChildren();
  getElement('gallery-count').textContent = String(freezes.length);
  getElement('gallery-empty').classList.toggle('is-hidden', freezes.length > 0);

  freezes.forEach((freeze, index) => {
    const url = URL.createObjectURL(freeze.blob);
    runtime.galleryObjectUrls.push(url);
    const card = document.createElement('article');
    card.className = `gallery-card${runtime.selectedGalleryIds.has(freeze.id) ? ' is-selected' : ''}`;
    card.draggable = true;
    card.dataset.freezeId = freeze.id;

    const preview = document.createElement('img');
    preview.src = url;
    preview.alt = `Saved pixel portrait ${index + 1}`;
    preview.addEventListener('click', () => void previewGalleryFreeze(freeze));

    const controls = document.createElement('div');
    controls.className = 'gallery-card-controls';
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = runtime.selectedGalleryIds.has(freeze.id);
    checkbox.setAttribute('aria-label', `Select portrait ${index + 1} to share`);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) runtime.selectedGalleryIds.add(freeze.id);
      else runtime.selectedGalleryIds.delete(freeze.id);
      card.classList.toggle('is-selected', checkbox.checked);
      updateGallerySelection();
    });
    const date = document.createElement('span');
    date.textContent = new Date(freeze.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    label.append(checkbox, date);

    const previewButton = document.createElement('button');
    previewButton.type = 'button';
    previewButton.className = 'button button-quiet gallery-preview-button';
    previewButton.textContent = 'Preview';
    previewButton.addEventListener('click', () => void previewGalleryFreeze(freeze));
    controls.append(label, previewButton);
    card.addEventListener('dragstart', (event) => {
      event.dataTransfer?.setData('text/plain', freeze.id);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
    });
    let touchDragStart: { x: number; y: number; moved: boolean } | null = null;
    preview.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse') return;
      touchDragStart = { x: event.clientX, y: event.clientY, moved: false };
      preview.setPointerCapture(event.pointerId);
    });
    preview.addEventListener('pointermove', (event) => {
      if (!touchDragStart) return;
      if (Math.hypot(event.clientX - touchDragStart.x, event.clientY - touchDragStart.y) > 12) {
        touchDragStart.moved = true;
      }
    });
    preview.addEventListener('pointerup', (event) => {
      if (!touchDragStart) return;
      const { moved } = touchDragStart;
      touchDragStart = null;
      if (!moved) return;
      event.preventDefault();
      const bounds = elements.stage.getBoundingClientRect();
      if (
        event.clientX >= bounds.left &&
        event.clientX <= bounds.right &&
        event.clientY >= bounds.top &&
        event.clientY <= bounds.bottom
      ) {
        void previewGalleryFreeze(freeze);
      }
    });
    preview.addEventListener('pointercancel', () => {
      touchDragStart = null;
    });
    card.append(preview, controls);
    grid.append(card);
  });
  updateGallerySelection();
}
