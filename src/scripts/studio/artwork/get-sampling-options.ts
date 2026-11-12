import { getActiveTheme } from "../../../lib/config";
import type { SamplingOptions } from "../../../lib/types";
import { model } from "../state/model";

/** Build sampling inputs from the current artwork controls and admin limits. */
export function getSamplingOptions(): SamplingOptions {
  return {
    tileSize: model.tileSize,
    subjectEnabled: model.subjectEnabled,
    subjectThreshold: model.subjectThreshold,
    subjectContrast: model.subjectContrast,
    backgroundDensity: model.backgroundDensity,
    darkCutoffPercent: model.config.darkCutoffPercent,
    lightCutoffPercent: model.config.lightCutoffPercent,
    colorCount: model.config.enforceTheme
      ? getActiveTheme(model.config).colors.length
      : model.freeColorCount,
    randomSeed: model.randomSeed,
    manualSubjectMask: model.manualSubjectMask,
    subjectMask: model.subjectMask,
  };
}
