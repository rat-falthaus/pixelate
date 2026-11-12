import { analyzeSubjectShapes } from "../../../lib/recognition";
import type { ImageSource } from "../../../lib/types";
import { getElement } from "../dom/get-element";
import { model } from "../state/model";
import { runtime } from "../state/runtime";
import { notify } from "../ui/notify";

/** Replace rather than accumulate silhouettes, so moving/absent subjects never leave stale masks. */
export function updateSubjectMask(image: ImageSource): void {
  if (!runtime.subjectDetectors) {
    model.subjectMask = null;
    return;
  }
  try {
    const { regions, mask } = analyzeSubjectShapes(image, runtime.subjectDetectors);
    model.subjectMask = mask;
    const labels = [...new Set(regions.map((region) => region.label))];
    getElement("recognition-status").textContent = mask.confidence.some((value) => value >= 0.5)
      ? `Recognized locally: ${labels.join(", ")}. Silhouette masking active.`
      : "No subject outline found. Move closer or use the subject brush.";
  } catch (error) {
    console.error("Subject recognition stopped.", error);
    runtime.subjectDetectors.faces.close();
    runtime.subjectDetectors.objects.close();
    runtime.subjectDetectors.segmenter.close();
    runtime.subjectDetectors = null;
    model.subjectMask = null;
    getElement("recognition-status").textContent =
      "Recognition unavailable - heuristic subject controls are active.";
    notify("Subject recognition stopped. Heuristic subject controls remain available.");
  }
}
