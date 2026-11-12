import type { MessagePosition } from "../../../lib/types";
import { renderArtwork } from "../artwork/render-artwork";
import { restartSelectedCamera } from "../camera/restart-selected-camera";
import { elements } from "../dom/elements";
import { getElement } from "../dom/get-element";
import { model } from "../state/model";
import { applyWorkspaceSettings } from "../ui/apply-workspace-settings";
import { notify } from "../ui/notify";
import { persistSettings } from "./persist-settings";

/** Validate and apply admin form values, persist them locally, and refresh the workspace. */
export function applyAdminSettings(): void {
  const enforceTheme = (getElement("setting-lock-palette") as HTMLInputElement).checked;
  const fairMode = (getElement("setting-fair-mode") as HTMLInputElement).checked;
  const title = (getElement("setting-title") as HTMLInputElement).value.trim();
  const signature = (getElement("setting-signature") as HTMLInputElement).value.trim();
  const defaultMessage = (getElement("setting-message") as HTMLTextAreaElement).value;
  const pin = (getElement("setting-pin") as HTMLInputElement).value.trim();
  const cameraDeviceId = (getElement("setting-camera") as HTMLSelectElement).value;
  const cameraChanged = model.config.cameraDeviceId !== cameraDeviceId;
  if (pin && pin.length < 3) {
    notify("PIN must contain at least 3 characters.");
    return;
  }
  model.config.enforceTheme = enforceTheme;
  model.config.fairMode = fairMode;
  model.config.cameraDeviceId = cameraDeviceId;
  model.config.applicationTitle = title || "Pixel Studio";
  model.config.brandSignature = signature;
  model.config.defaultMessage = defaultMessage;
  model.config.messagePosition = (getElement("setting-message-position") as HTMLSelectElement)
    .value as MessagePosition;
  model.config.messagePositionLocked = (
    getElement("setting-lock-message-position") as HTMLInputElement
  ).checked;
  model.config.logoPosition = (getElement("setting-logo-position") as HTMLSelectElement)
    .value as MessagePosition;
  model.config.logoPositionLocked = (
    getElement("setting-lock-logo-position") as HTMLInputElement
  ).checked;
  model.config.clearGalleryAfterShare = (
    getElement("setting-clear-gallery") as HTMLInputElement
  ).checked;
  model.config.galleryClearDelaySeconds = Math.max(
    0,
    Math.min(30, Number((getElement("setting-gallery-delay") as HTMLInputElement).value) || 0),
  );
  model.config.useUploadedFont =
    (getElement("setting-font-choice") as HTMLSelectElement).value === "uploaded";
  model.config.darkCutoffPercent = Number(
    (getElement("setting-dark-cutoff") as HTMLInputElement).value,
  );
  model.config.lightCutoffPercent = Number(
    (getElement("setting-light-cutoff") as HTMLInputElement).value,
  );
  model.config.hairlines = (getElement("setting-hairlines") as HTMLInputElement).checked;
  if (pin) model.config.adminPin = pin;
  const permissionIds: Record<keyof typeof model.config.permissions, string> = {
    subject: "permission-subject",
    message: "permission-message",
    size: "permission-size",
    background: "permission-background",
    mapping: "permission-mapping",
    recolor: "permission-recolor",
  };
  Object.entries(permissionIds).forEach(([permission, id]) => {
    model.config.permissions[permission as keyof typeof model.config.permissions] = (
      getElement(id) as HTMLInputElement
    ).checked;
  });
  model.message = defaultMessage;
  model.messagePosition = model.config.messagePosition;
  model.messageOrigin = null;
  model.logoOrigin = null;
  elements.messageText.value = defaultMessage;
  persistSettings();
  elements.adminDialog.close();
  applyWorkspaceSettings();
  renderArtwork();
  notify("Brand and kiosk settings applied.");
  if (cameraChanged) void restartSelectedCamera();
}
