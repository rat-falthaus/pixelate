export interface StoredBrandAsset {
  id: string;
  kind: 'logo' | 'font';
  name: string;
  type: string;
  blob: Blob;
  width?: number;
  height?: number;
}

export interface GalleryFreeze {
  id: string;
  createdAt: number;
  blob: Blob;
}
