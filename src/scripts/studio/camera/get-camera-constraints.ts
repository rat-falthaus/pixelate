import { model } from "../state/model";

/** Honor an explicitly selected input for both camera modes; never silently switch devices. */
export function getCameraConstraints(): MediaStreamConstraints {
  return {
    audio: false,
    video: {
      ...(model.config.cameraDeviceId
        ? { deviceId: { exact: model.config.cameraDeviceId } }
        : { facingMode: "user" }),
      width: { ideal: 1280 },
      height: { ideal: 960 },
    },
  };
}
