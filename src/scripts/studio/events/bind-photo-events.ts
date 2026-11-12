import { openCamera } from "../camera/open-camera";
import { elements } from "../dom/elements";
import { getElement } from "../dom/get-element";
import { openFile } from "../photo/open-file";

/** Connect local photo selection and drag-and-drop upload controls. */
export function bindPhotoEvents(): void {
  getElement("upload-open").addEventListener("click", () => elements.fileInput.click());
  getElement("empty-upload").addEventListener("click", () => elements.fileInput.click());
  getElement("live-upload").addEventListener("click", () => elements.fileInput.click());
  getElement("empty-camera").addEventListener("click", () => void openCamera());
  elements.dropZone.addEventListener("click", () => elements.fileInput.click());
  elements.fileInput.addEventListener("change", () => {
    const file = elements.fileInput.files?.[0];
    if (file) void openFile(file);
    elements.fileInput.value = "";
  });
  elements.dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    elements.dropZone.classList.add("is-dragover");
  });
  elements.dropZone.addEventListener("dragleave", () =>
    elements.dropZone.classList.remove("is-dragover"),
  );
  elements.dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove("is-dragover");
    const file = (event as DragEvent).dataTransfer?.files[0];
    if (file) void openFile(file);
  });
}
