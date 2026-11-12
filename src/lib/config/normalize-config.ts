import type { StudioConfig, VisitorPermissions } from "../types";
import { clampNumber } from "./clamp-number";
import { cloneDefaultConfig } from "./clone-default-config";
import { isMessagePosition } from "./is-message-position";
import { isTheme } from "./is-theme";
import { DEFAULT_CONFIG, DEFAULT_PERMISSIONS } from "./state";

/** Validate stored settings and merge compatible values with bundled defaults. */
export function normalizeConfig(value: unknown): StudioConfig {
  if (!value || typeof value !== "object") return cloneDefaultConfig();
  const { hairlines, ...stored } = value as Partial<StudioConfig> & { hairlines?: unknown };
  const themes = Array.isArray(stored.themes) ? stored.themes.filter(isTheme) : [];
  const safeThemes = themes.length ? themes : cloneDefaultConfig().themes;
  const activeThemeId = safeThemes.some((theme) => theme.id === stored.activeThemeId)
    ? stored.activeThemeId!
    : safeThemes[0].id;
  const permissions =
    stored.permissions && typeof stored.permissions === "object" ? stored.permissions : {};
  const permissionValue = (key: keyof VisitorPermissions): boolean =>
    typeof (permissions as Record<string, unknown>)[key] === "boolean"
      ? (permissions as Record<string, boolean>)[key]
      : DEFAULT_PERMISSIONS[key];
  const normalizedPermissions: VisitorPermissions = {
    subject: permissionValue("subject"),
    message: permissionValue("message"),
    size: permissionValue("size"),
    background: permissionValue("background"),
    mapping: permissionValue("mapping"),
    recolor: permissionValue("recolor"),
  };

  return {
    ...DEFAULT_CONFIG,
    ...stored,
    enforceTheme:
      typeof stored.enforceTheme === "boolean" ? stored.enforceTheme : DEFAULT_CONFIG.enforceTheme,
    fairMode: typeof stored.fairMode === "boolean" ? stored.fairMode : DEFAULT_CONFIG.fairMode,
    cameraDeviceId: typeof stored.cameraDeviceId === "string" ? stored.cameraDeviceId : "",
    messagePosition: isMessagePosition(stored.messagePosition)
      ? stored.messagePosition
      : DEFAULT_CONFIG.messagePosition,
    logoPosition: isMessagePosition(stored.logoPosition)
      ? stored.logoPosition
      : DEFAULT_CONFIG.logoPosition,
    messagePositionLocked:
      typeof stored.messagePositionLocked === "boolean"
        ? stored.messagePositionLocked
        : DEFAULT_CONFIG.messagePositionLocked,
    logoPositionLocked:
      typeof stored.logoPositionLocked === "boolean"
        ? stored.logoPositionLocked
        : DEFAULT_CONFIG.logoPositionLocked,
    logoAssetId: typeof stored.logoAssetId === "string" ? stored.logoAssetId : null,
    fontAssetId: typeof stored.fontAssetId === "string" ? stored.fontAssetId : null,
    useUploadedFont:
      typeof stored.useUploadedFont === "boolean"
        ? stored.useUploadedFont
        : DEFAULT_CONFIG.useUploadedFont,
    clearGalleryAfterShare:
      typeof stored.clearGalleryAfterShare === "boolean"
        ? stored.clearGalleryAfterShare
        : DEFAULT_CONFIG.clearGalleryAfterShare,
    galleryClearDelaySeconds: clampNumber(
      stored.galleryClearDelaySeconds,
      0,
      30,
      DEFAULT_CONFIG.galleryClearDelaySeconds,
    ),
    tileSpacingPercent: clampNumber(
      stored.tileSpacingPercent,
      0,
      50,
      hairlines === false ? 0 : DEFAULT_CONFIG.tileSpacingPercent,
    ),
    adminPin:
      typeof stored.adminPin === "string" && stored.adminPin.length >= 3
        ? stored.adminPin
        : DEFAULT_CONFIG.adminPin,
    applicationTitle:
      typeof stored.applicationTitle === "string"
        ? stored.applicationTitle
        : DEFAULT_CONFIG.applicationTitle,
    brandSignature:
      typeof stored.brandSignature === "string"
        ? stored.brandSignature
        : DEFAULT_CONFIG.brandSignature,
    defaultMessage:
      typeof stored.defaultMessage === "string"
        ? stored.defaultMessage
        : DEFAULT_CONFIG.defaultMessage,
    darkCutoffPercent: clampNumber(
      stored.darkCutoffPercent,
      0,
      60,
      DEFAULT_CONFIG.darkCutoffPercent,
    ),
    lightCutoffPercent: clampNumber(
      stored.lightCutoffPercent,
      50,
      100,
      DEFAULT_CONFIG.lightCutoffPercent,
    ),
    activeThemeId,
    themes: safeThemes.map((theme) => ({
      ...theme,
      colors: theme.colors.map((color) => color.toUpperCase()),
    })),
    permissions: normalizedPermissions,
  };
}
