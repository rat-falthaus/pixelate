import { applyAdminSettings } from "../admin/apply-admin-settings";
import { openAdminGate } from "../admin/open-admin-gate";
import { submitPin } from "../admin/submit-pin";
import { elements } from "../dom/elements";
import { getElement } from "../dom/get-element";
import { copySvg } from "../sharing/copy-svg";
import { downloadSvg } from "../sharing/download-svg";

/** Connect exports, PIN entry, admin access, and dialog dismissal. */
export function bindAdminAccessEvents(): void {
  getElement("download-svg").addEventListener("click", downloadSvg);
  getElement("copy-svg").addEventListener("click", () => void copySvg());
  getElement("admin-open").addEventListener("click", openAdminGate);
  window.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "a") {
      event.preventDefault();
      openAdminGate();
    }
  });
  getElement("pin-submit").addEventListener("click", submitPin);
  elements.pinInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") submitPin();
  });
  getElement("pin-clear").addEventListener("click", () => {
    elements.pinInput.value = "";
    elements.pinError.classList.add("is-hidden");
  });
  document.querySelectorAll<HTMLButtonElement>("[data-key]").forEach((button) => {
    button.addEventListener("click", () => {
      if (elements.pinInput.value.length < 16) elements.pinInput.value += button.dataset.key;
      elements.pinError.classList.add("is-hidden");
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-close]").forEach((button) => {
    button.addEventListener("click", () => {
      const dialog = getElement(button.dataset.close ?? "");
      if (dialog instanceof HTMLDialogElement) dialog.close();
    });
  });
  getElement("apply-settings").addEventListener("click", applyAdminSettings);
}
