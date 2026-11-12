import type { BrandTheme, MessagePosition, StudioConfig, VisitorPermissions } from './types';

export const STORAGE_KEY = 'white-label-pixel-studio-config-v1';

export const DEFAULT_THEME: BrandTheme = {
  id: 'studio-default',
  name: 'Studio palette',
  colors: ['#F2C94C', '#56CCF2', '#2F80ED', '#9B51E0', '#EB5757', '#F2994A', '#6FCF97'],
};

export const DEFAULT_PERMISSIONS: VisitorPermissions = {
  subject: true,
  message: false,
  size: true,
  background: false,
  mapping: false,
  recolor: false,
};

export const DEFAULT_CONFIG: StudioConfig = {
  adminPin: '1234',
  applicationTitle: 'Pixel Studio',
  brandSignature: 'YOUR BRAND',
  defaultMessage: 'MAKE\nSOMETHING\nMATTER.',
  enforceTheme: true,
  fairMode: false,
  messagePosition: 'upper',
  logoPosition: 'lower',
  messagePositionLocked: true,
  logoPositionLocked: true,
  logoAssetId: null,
  fontAssetId: null,
  useUploadedFont: false,
  clearGalleryAfterShare: true,
  galleryClearDelaySeconds: 0,
  darkCutoffPercent: 20,
  lightCutoffPercent: 95,
  hairlines: true,
  permissions: { ...DEFAULT_PERMISSIONS },
  activeThemeId: DEFAULT_THEME.id,
  themes: [{ ...DEFAULT_THEME, colors: [...DEFAULT_THEME.colors] }],
};

function isTheme(value: unknown): value is BrandTheme {
  if (!value || typeof value !== 'object') return false;
  const theme = value as Partial<BrandTheme>;
  return typeof theme.id === 'string'
    && typeof theme.name === 'string'
    && Array.isArray(theme.colors)
    && theme.colors.length >= 2
    && theme.colors.every((color) => typeof color === 'string' && /^#[\da-f]{6}$/i.test(color));
}

export function normalizeConfig(value: unknown): StudioConfig {
  if (!value || typeof value !== 'object') return cloneDefaultConfig();
  const stored = value as Partial<StudioConfig>;
  const themes = Array.isArray(stored.themes) ? stored.themes.filter(isTheme) : [];
  const safeThemes = themes.length ? themes : cloneDefaultConfig().themes;
  const activeThemeId = safeThemes.some((theme) => theme.id === stored.activeThemeId)
    ? stored.activeThemeId!
    : safeThemes[0].id;
  const permissions = stored.permissions && typeof stored.permissions === 'object'
    ? stored.permissions
    : {};
  const permissionValue = (key: keyof VisitorPermissions): boolean => (
    typeof (permissions as Record<string, unknown>)[key] === 'boolean'
      ? (permissions as Record<string, boolean>)[key]
      : DEFAULT_PERMISSIONS[key]
  );
  const normalizedPermissions: VisitorPermissions = {
    subject: permissionValue('subject'),
    message: permissionValue('message'),
    size: permissionValue('size'),
    background: permissionValue('background'),
    mapping: permissionValue('mapping'),
    recolor: permissionValue('recolor'),
  };

  return {
    ...DEFAULT_CONFIG,
    ...stored,
    enforceTheme: typeof stored.enforceTheme === 'boolean' ? stored.enforceTheme : DEFAULT_CONFIG.enforceTheme,
    fairMode: typeof stored.fairMode === 'boolean' ? stored.fairMode : DEFAULT_CONFIG.fairMode,
    messagePosition: isMessagePosition(stored.messagePosition) ? stored.messagePosition : DEFAULT_CONFIG.messagePosition,
    logoPosition: isMessagePosition(stored.logoPosition) ? stored.logoPosition : DEFAULT_CONFIG.logoPosition,
    messagePositionLocked: typeof stored.messagePositionLocked === 'boolean'
      ? stored.messagePositionLocked
      : DEFAULT_CONFIG.messagePositionLocked,
    logoPositionLocked: typeof stored.logoPositionLocked === 'boolean'
      ? stored.logoPositionLocked
      : DEFAULT_CONFIG.logoPositionLocked,
    logoAssetId: typeof stored.logoAssetId === 'string' ? stored.logoAssetId : null,
    fontAssetId: typeof stored.fontAssetId === 'string' ? stored.fontAssetId : null,
    useUploadedFont: typeof stored.useUploadedFont === 'boolean'
      ? stored.useUploadedFont
      : DEFAULT_CONFIG.useUploadedFont,
    clearGalleryAfterShare: typeof stored.clearGalleryAfterShare === 'boolean'
      ? stored.clearGalleryAfterShare
      : DEFAULT_CONFIG.clearGalleryAfterShare,
    galleryClearDelaySeconds: clampNumber(
      stored.galleryClearDelaySeconds,
      0,
      30,
      DEFAULT_CONFIG.galleryClearDelaySeconds,
    ),
    hairlines: typeof stored.hairlines === 'boolean' ? stored.hairlines : DEFAULT_CONFIG.hairlines,
    adminPin: typeof stored.adminPin === 'string' && stored.adminPin.length >= 3 ? stored.adminPin : DEFAULT_CONFIG.adminPin,
    applicationTitle: typeof stored.applicationTitle === 'string' ? stored.applicationTitle : DEFAULT_CONFIG.applicationTitle,
    brandSignature: typeof stored.brandSignature === 'string' ? stored.brandSignature : DEFAULT_CONFIG.brandSignature,
    defaultMessage: typeof stored.defaultMessage === 'string' ? stored.defaultMessage : DEFAULT_CONFIG.defaultMessage,
    darkCutoffPercent: clampNumber(stored.darkCutoffPercent, 0, 60, DEFAULT_CONFIG.darkCutoffPercent),
    lightCutoffPercent: clampNumber(stored.lightCutoffPercent, 50, 100, DEFAULT_CONFIG.lightCutoffPercent),
    activeThemeId,
    themes: safeThemes.map((theme) => ({ ...theme, colors: theme.colors.map((color) => color.toUpperCase()) })),
    permissions: normalizedPermissions,
  };
}

function isMessagePosition(value: unknown): value is MessagePosition {
  return value === 'upper' || value === 'center' || value === 'lower'
    || value === 'topleft' || value === 'topright' || value === 'middleleft'
    || value === 'middleright' || value === 'bottomleft' || value === 'bottomright';
}

export function loadConfig(): StudioConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeConfig(JSON.parse(raw)) : cloneDefaultConfig();
  } catch (error) {
    console.warn('Saved studio settings could not be read; using the bundled defaults.', error);
    return cloneDefaultConfig();
  }
}

export function saveConfig(config: StudioConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Unable to save studio settings in this browser.', error);
    throw new Error('Settings could not be saved. Check available browser storage.');
  }
}

export function cloneDefaultConfig(): StudioConfig {
  return structuredClone(DEFAULT_CONFIG);
}

export function getActiveTheme(config: StudioConfig): BrandTheme {
  return config.themes.find((theme) => theme.id === config.activeThemeId) ?? config.themes[0];
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}
