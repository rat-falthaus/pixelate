import { deleteBrandAsset, saveBrandAsset } from '../../../lib/local-store';
import { persistSettings } from '../admin/persist-settings';
import { renderArtwork } from '../artwork/render-artwork';
import { getElement } from '../dom/get-element';
import { model } from '../state/model';
import { notify } from '../ui/notify';
import { readBlobAsDataUrl } from './read-blob-as-data-url';

/** Load an embeddable local font, persist it, and select it for artwork rendering. */
export async function uploadFont(file: File): Promise<void> {
  if (file.size > 10 * 1024 * 1024) throw new Error('Font files must be 10 MB or smaller.');
  const allowedTypes = new Set([
    'font/woff2',
    'font/woff',
    'font/ttf',
    'font/otf',
    'application/font-woff',
    'application/octet-stream',
  ]);
  if (!allowedTypes.has(file.type) && !/\.(woff2?|ttf|otf)$/i.test(file.name)) {
    throw new Error('Choose a WOFF2, WOFF, TTF, or OTF font file.');
  }
  const blobUrl = URL.createObjectURL(file);
  try {
    const face = new FontFace('BrandUploaded', `url("${blobUrl}")`);
    await face.load();
    document.fonts.add(face);
    const asset = await saveBrandAsset({
      kind: 'font',
      name: file.name,
      type: file.type || 'application/octet-stream',
      blob: file,
    });
    if (model.config.fontAssetId) await deleteBrandAsset(model.config.fontAssetId);
    model.config.fontAssetId = asset.id;
    model.config.useUploadedFont = true;
    model.fontFamily = 'BrandUploaded';
    model.fontDataUri = await readBlobAsDataUrl(file);
    persistSettings();
    getElement('setting-font-name').textContent = file.name;
    (getElement('setting-font-choice') as HTMLSelectElement).value = 'uploaded';
    renderArtwork();
    notify('Uploaded font saved on this device.');
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}
