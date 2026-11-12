import { createSubjectDetectors } from "../../../lib/recognition";
import type { SubjectDetectors } from "../../../lib/recognition";
import { getElement } from "../dom/get-element";
import { runtime } from "../state/runtime";

/** Share one initialization promise across photo loading and camera restarts. */
export async function ensureSubjectDetectors(): Promise<SubjectDetectors> {
  if (runtime.subjectDetectors) return runtime.subjectDetectors;
  if (!runtime.subjectDetectorsLoading) {
    getElement("recognition-status").textContent =
      "Loading local detection and silhouette models...";
    runtime.subjectDetectorsLoading = createSubjectDetectors(import.meta.env.BASE_URL)
      .then((detectors) => {
        runtime.subjectDetectors = detectors;
        return detectors;
      })
      .finally(() => {
        runtime.subjectDetectorsLoading = null;
      });
  }
  return runtime.subjectDetectorsLoading;
}
