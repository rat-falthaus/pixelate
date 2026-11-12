import type { SubjectMask } from './recognition/types';

export type BackgroundMode = 'black' | 'white' | 'transparent';
export type ToolMode = 'pan' | 'recolor' | 'subject';
export type MaskBrushMode = 'keep' | 'background';
export type MessagePosition =
  | 'upper'
  | 'center'
  | 'lower'
  | 'topleft'
  | 'topright'
  | 'middleleft'
  | 'middleright'
  | 'bottomleft'
  | 'bottomright';
export type TileOverride = string | 'ERASE';
export type ImageSource = HTMLImageElement | HTMLCanvasElement;

export interface ArtworkSnapshot {
  svg: string;
  width: number;
  height: number;
  fileName: string;
  pngBlob: Blob | null;
  galleryFreezeId: string | null;
}

export interface BrandTheme {
  id: string;
  name: string;
  colors: string[];
}

export interface VisitorPermissions {
  subject: boolean;
  message: boolean;
  size: boolean;
  background: boolean;
  mapping: boolean;
  recolor: boolean;
}

export interface StudioConfig {
  adminPin: string;
  applicationTitle: string;
  brandSignature: string;
  defaultMessage: string;
  enforceTheme: boolean;
  fairMode: boolean;
  cameraDeviceId: string;
  messagePosition: MessagePosition;
  logoPosition: MessagePosition;
  messagePositionLocked: boolean;
  logoPositionLocked: boolean;
  logoAssetId: string | null;
  fontAssetId: string | null;
  useUploadedFont: boolean;
  clearGalleryAfterShare: boolean;
  galleryClearDelaySeconds: number;
  darkCutoffPercent: number;
  lightCutoffPercent: number;
  hairlines: boolean;
  permissions: VisitorPermissions;
  activeThemeId: string;
  themes: BrandTheme[];
}

export interface PhotoCell {
  col: number;
  row: number;
  r: number;
  g: number;
  b: number;
  luminance: number;
  isSubject: boolean;
  clusterIndex: number;
}

export interface ColorCluster {
  r: number;
  g: number;
  b: number;
  hex: string;
  luminance: number;
}

export interface SampledArtwork {
  cols: number;
  rows: number;
  cells: PhotoCell[];
  clusters: ColorCluster[];
  saliency: Float32Array;
}

export interface SamplingOptions {
  tileSize: number;
  subjectEnabled: boolean;
  subjectThreshold: number;
  subjectContrast: number;
  backgroundDensity: number;
  darkCutoffPercent: number;
  lightCutoffPercent: number;
  colorCount: number;
  randomSeed: number;
  manualSubjectMask: Map<string, boolean>;
  subjectMask: SubjectMask | null;
}

export interface ArtworkOptions {
  grid: SampledArtwork;
  tileSize: number;
  theme: BrandTheme;
  enforceTheme: boolean;
  clusterToTheme: number[];
  manualTileOverrides: Map<string, TileOverride>;
  background: BackgroundMode;
  includeBackground: boolean;
  hairlines: boolean;
  backgroundScatter: number;
  randomSeed: number;
  messageEnabled: boolean;
  message: string;
  messagePosition: MessagePosition;
  messageOrigin: { col: number; row: number } | null;
  messageScale: number;
  brandSignature: string;
  showBadge: boolean;
  logoDataUrl: string | null;
  logoAspectRatio: number;
  logoPosition: MessagePosition;
  logoOrigin: { col: number; row: number } | null;
  fontFamily: string;
  fontDataUri: string | null;
}

export interface AppModel {
  config: StudioConfig;
  image: ImageSource | null;
  subjectMask: SubjectMask | null;
  fileName: string;
  tileSize: number;
  freeColorCount: number;
  background: BackgroundMode;
  includeBackground: boolean;
  subjectEnabled: boolean;
  subjectThreshold: number;
  subjectContrast: number;
  backgroundDensity: number;
  backgroundScatter: number;
  randomSeed: number;
  messageEnabled: boolean;
  message: string;
  messagePosition: MessagePosition;
  messageOrigin: { col: number; row: number } | null;
  logoOrigin: { col: number; row: number } | null;
  messageScale: number;
  logoDataUrl: string | null;
  logoAspectRatio: number;
  fontFamily: string;
  fontDataUri: string | null;
  showBadge: boolean;
  clusters: ColorCluster[];
  cells: PhotoCell[];
  saliency: Float32Array;
  gridCols: number;
  gridRows: number;
  clusterToTheme: number[];
  manualSubjectMask: Map<string, boolean>;
  manualTileOverrides: Map<string, TileOverride>;
  tileUndoStack: Map<string, TileOverride>[];
  currentSvg: string;
  tool: ToolMode;
  selectedBrush: TileOverride;
  maskBrush: MaskBrushMode;
  fitScale: number;
  showOriginal: boolean;
  liveCameraActive: boolean;
  freezePreview: boolean;
}
