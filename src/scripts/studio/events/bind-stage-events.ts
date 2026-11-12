import { elements } from "../dom/elements";
import { endStagePointer } from "./end-stage-pointer";
import { handleStageDrop } from "./handle-stage-drop";
import { handleStagePointerDown } from "./handle-stage-pointer-down";
import { handleStagePointerMove } from "./handle-stage-pointer-move";

/** Connect touch/mouse overlay positioning, painting, and gallery drops without image zoom. */
export function bindStageEvents(): void {
  elements.stage.addEventListener("pointerdown", handleStagePointerDown);
  elements.stage.addEventListener("pointermove", handleStagePointerMove);

  elements.stage.addEventListener("pointerup", endStagePointer);
  elements.stage.addEventListener("pointercancel", endStagePointer);
  elements.stage.addEventListener("dragover", (event) => event.preventDefault());
  elements.stage.addEventListener("drop", handleStageDrop);
}
