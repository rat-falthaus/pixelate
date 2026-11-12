import { model } from '../state/model';
import { notify } from '../ui/notify';
import { createPngBlob } from './create-png-blob';
import { downloadBlob } from './download-blob';

/** Export the current artwork as PNG and report rasterization failures. */
export async function downloadPng(): Promise<void> {
  try {
    downloadBlob(await createPngBlob(), `${model.fileName}.png`);
  } catch (error) {
    notify(error instanceof Error ? error.message : 'The PNG image could not be saved.');
  }
}
