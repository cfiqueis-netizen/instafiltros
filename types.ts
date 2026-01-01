export interface Photo {
  id: number;
  dataUrl: string;
  timestamp: number;
  aspectRatio: '9:16' | '16:9';
}

export enum AppView {
  CAMERA = 'CAMERA',
  EDITOR = 'EDITOR',
  GALLERY = 'GALLERY',
}

export type FilterType = 'none' | 'warm' | 'cool' | 'sepia' | 'grayscale' | 'vintage' | 'contrast';

export interface FilterConfig {
  name: string;
  label: string;
  filter: string; // CSS/Canvas filter string
}

export type FrameType = 'none' | 'custom' | 'white-border' | 'polaroid' | 'cinema' | 'vignette';

export interface FrameConfig {
  name: FrameType;
  label: string;
}

export type StickerType = 'none' | 'bom-dia' | 'boa-tarde' | 'boa-noite' | 'gratidao' | 'felicidade';

export interface StickerConfig {
  name: StickerType;
  label: string;
  text: string;
  color: string;
  font: string;
}