import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageEntry = fileURLToPath(import.meta.resolve("@mediapipe/tasks-vision"));
const sourceDirectory = join(dirname(packageEntry), "wasm");
const targetDirectory = resolve("public/vendor/mediapipe/wasm");
const files = ["vision_wasm_internal.js", "vision_wasm_internal.wasm"];

await mkdir(targetDirectory, { recursive: true });
for (const file of files) {
  await copyFile(join(sourceDirectory, file), join(targetDirectory, file));
}
