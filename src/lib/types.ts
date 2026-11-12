export type BackgroundMode = 'black' | 'white' | 'transparent';
export type ToolMode = 'pan' | 'recolor' | 'subject';
export type MaskBrushMode = 'keep' | 'background';
export type MessagePosition = 'upper' | 'center' | 'lower' | 'topleft';
export type TileOverride = string | 'ERASE';

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
}

export interface AppModel {
  config: StudioConfig;
  image: HTMLImageElement | null;
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
  messageScale: number;
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
  zoom: number;
  panX: number;
  panY: number;
  showOriginal: boolean;
}
