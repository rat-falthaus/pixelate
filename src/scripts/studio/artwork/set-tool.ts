import type { ToolMode } from "../../../lib/types";
import { elements } from "../dom/elements";
import { getElement } from "../dom/get-element";
import { model } from "../state/model";

/** Select the canvas interaction tool and synchronize its controls and usage hint. */
export function setTool(tool: ToolMode): void {
  model.tool = tool;
  document.querySelectorAll<HTMLButtonElement>("[data-tool]").forEach((button) => {
    const selected = button.dataset.tool === tool;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  elements.maskBrushes.classList.toggle("is-hidden", tool !== "subject");
  elements.brushSwatches.classList.toggle("is-hidden", tool === "subject");
  const hints: Record<ToolMode, string> = {
    pan: "Position unlocked text or logo",
    recolor: "Tap or drag across tiles to recolor",
    subject: "Paint areas to keep as subject or scatter as background",
  };
  getElement("hint-text").textContent = hints[tool];
  getElement("hint-dot").className = `hint-dot hint-${tool}`;
}
