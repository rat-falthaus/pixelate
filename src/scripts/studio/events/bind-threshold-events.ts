import { getElement } from "../dom/get-element";
import { model } from "../state/model";
import { bindRange } from "./bind-range";

/** Connect admin luminance cutoffs and default tile spacing to their configuration values. */
export function bindThresholdEvents(): void {
  bindRange(
    getElement<HTMLInputElement>("setting-tile-spacing"),
    getElement("default-tile-spacing-value"),
    (value) => {
      model.config.tileSpacingPercent = value;
    },
  );
  bindRange(
    getElement("setting-dark-cutoff") as HTMLInputElement,
    getElement("dark-cutoff-value"),
    (value) => {
      model.config.darkCutoffPercent = value;
    },
  );
  bindRange(
    getElement("setting-light-cutoff") as HTMLInputElement,
    getElement("light-cutoff-value"),
    (value) => {
      model.config.lightCutoffPercent = value;
    },
  );
}
