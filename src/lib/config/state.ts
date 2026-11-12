import type { BrandTheme, StudioConfig, VisitorPermissions } from '../types';

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
  cameraDeviceId: '',
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
