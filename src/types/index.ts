export interface ImageItem {
  id: string;
  name: string;
  size: number;
  originalUrl: string;
  processedUrl: string;
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  filter?: 'none' | 'grayscale' | 'bw' | 'contrast';
  brightness?: number; // 0 to 200, default 100
  contrast?: number; // 0 to 200, default 100
}

export type PageSizeOption = 'a4' | 'letter' | 'legal' | 'fit';
export type OrientationOption = 'auto' | 'portrait' | 'landscape';
export type MarginOption = 'none' | 'small' | 'normal';
export type QualityOption = 'high' | 'medium' | 'low';

export interface PdfSettings {
  pageSize: PageSizeOption;
  orientation: OrientationOption;
  margin: MarginOption;
  quality: QualityOption;
  fileName: string;
}

