import { bindAdminAccessEvents } from "./bind-admin-access-events";
import { bindBrandAssetEvents } from "./bind-brand-asset-events";
import { bindBrushEvents } from "./bind-brush-events";
import { bindCameraEvents } from "./bind-camera-events";
import { bindCanvasEvents } from "./bind-canvas-events";
import { bindDrawerEvents } from "./bind-drawer-events";
import { bindLifecycleEvents } from "./bind-lifecycle-events";
import { bindMessageEvents } from "./bind-message-events";
import { bindPaletteEvents } from "./bind-palette-events";
import { bindPhotoEvents } from "./bind-photo-events";
import { bindShareEvents } from "./bind-share-events";
import { bindStageEvents } from "./bind-stage-events";
import { bindSubjectEvents } from "./bind-subject-events";
import { bindThemeEvents } from "./bind-theme-events";
import { bindThresholdEvents } from "./bind-threshold-events";
import { bindViewportEvents } from "./bind-viewport-events";

/** Register feature event binders once, preserving their startup order. */
export function bindEvents(): void {
  bindPhotoEvents();
  bindCameraEvents();
  bindBrandAssetEvents();
  bindDrawerEvents();
  bindShareEvents();
  bindSubjectEvents();
  bindMessageEvents();
  bindPaletteEvents();
  bindBrushEvents();
  bindCanvasEvents();
  bindStageEvents();
  bindViewportEvents();
  bindAdminAccessEvents();
  bindThemeEvents();
  bindThresholdEvents();
  bindLifecycleEvents();
}
