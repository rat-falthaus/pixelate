import { getElement } from "../dom/get-element";
import { model } from "../state/model";
import { notify } from "../ui/notify";

/** Refresh local video inputs, preserving the admin's pending choice and surfacing unavailable devices. */
export async function refreshCameraDevices(): Promise<void> {
  const select = getElement("setting-camera") as HTMLSelectElement;
  const help = getElement("camera-device-help");
  if (!navigator.mediaDevices?.enumerateDevices) {
    help.textContent = "Camera selection is unavailable in this browser or insecure page context.";
    select.disabled = true;
    return;
  }
  try {
    const devices = (await navigator.mediaDevices.enumerateDevices()).filter(
      (device) => device.kind === "videoinput" && device.deviceId,
    );
    const selected = select.dataset.initialized ? select.value : model.config.cameraDeviceId;
    select.replaceChildren(new Option("Automatic / front camera", ""));
    devices.forEach((device, index) => {
      select.add(
        new Option(
          device.label || `Camera ${index + 1} (start camera to reveal name)`,
          device.deviceId,
        ),
      );
    });
    if (selected && !devices.some((device) => device.deviceId === selected)) {
      select.add(new Option("Selected camera unavailable - choose another", selected));
    }
    select.value = selected;
    select.dataset.initialized = "true";
    select.disabled = false;
    help.textContent = devices.some((device) => device.label)
      ? "Selection applies to live and still capture. Apply settings to switch an active camera."
      : "Start a camera once to grant access and reveal device names.";
  } catch (error) {
    console.error("Camera inputs could not be enumerated.", error);
    help.textContent = "Camera inputs could not be listed. Check browser camera permissions.";
    notify("Camera inputs could not be listed. Check browser camera permissions.");
  }
}
