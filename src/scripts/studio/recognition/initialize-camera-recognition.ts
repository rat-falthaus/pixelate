import { createHandLandmarker } from "../../../lib/gesture";
import { getElement } from "../dom/get-element";
import { runtime } from "../state/runtime";
import { notify } from "../ui/notify";
import { ensureSubjectDetectors } from "./ensure-subject-detectors";
import { updateLiveUi } from "../ui/update-live-ui";

/** Initialize optional recognition after live rendering starts, with explicit independent failure paths. */
export async function initializeCameraRecognition(): Promise<void> {
  const recognition = Promise.all([
    ensureSubjectDetectors().catch((error: unknown) => {
      console.error("Local face/object recognition could not be initialized.", error);
      getElement("recognition-status").textContent =
        "Recognition unavailable - heuristic subject controls are active.";
      notify(
        "Face/object recognition is unavailable. Heuristic subject controls remain available.",
      );
    }),
    (runtime.handLandmarker
      ? Promise.resolve(runtime.handLandmarker)
      : (runtime.handLandmarkerLoading ??= createHandLandmarker(import.meta.env.BASE_URL)
          .then((landmarker) => {
            runtime.handLandmarker = landmarker;
            return landmarker;
          })
          .finally(() => {
            runtime.handLandmarkerLoading = null;
          }))
    ).catch((error: unknown) => {
      console.error("Offline hand recognition could not be initialized.", error);
      notify("Gesture recognition is unavailable. Use the capture button instead.");
    }),
  ]);
  updateLiveUi();
  await recognition;
  updateLiveUi();
}
