import { notify } from "../ui/notify";
import { createPngBlob } from "./create-png-blob";
import { downloadBlob } from "./download-blob";
import { getExportSnapshot } from "./get-export-snapshot";

/** Export the current artwork as PNG and report rasterization failures. */
export async function downloadPng(): Promise<void> {
  try {
    const snapshot = getExportSnapshot(true);
    downloadBlob(await createPngBlob(snapshot), `${snapshot.fileName}.png`);
  } catch (error) {
    notify(error instanceof Error ? error.message : "The PNG image could not be saved.");
  }
}
