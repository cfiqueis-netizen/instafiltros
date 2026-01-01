import { FilterConfig, FrameConfig, StickerConfig } from './types';

export const FILTERS: FilterConfig[] = [
  { name: 'none', label: 'Normal', filter: 'none' },
  { name: 'contrast', label: 'Vívido', filter: 'contrast(1.2) saturate(1.2)' },
  { name: 'warm', label: 'Quente', filter: 'sepia(0.3) hue-rotate(-10deg) saturate(1.2)' },
  { name: 'cool', label: 'Frio', filter: 'hue-rotate(10deg) brightness(1.1)' },
  { name: 'sepia', label: 'Sépia', filter: 'sepia(1)' },
  { name: 'grayscale', label: 'P&B', filter: 'grayscale(1)' },
  { name: 'vintage', label: 'Retrô', filter: 'sepia(0.5) contrast(1.1) brightness(0.9)' },
];

export const FRAMES: FrameConfig[] = [
  { name: 'none', label: 'Sem Moldura' },
  { name: 'custom', label: 'Sua Moldura' },
  { name: 'white-border', label: 'Borda Branca' },
  { name: 'polaroid', label: 'Polaroid' },
  { name: 'cinema', label: 'Cinema' },
  { name: 'vignette', label: 'Vinheta' },
];

export const STICKERS: StickerConfig[] = [
  { name: 'none', label: 'Sem Texto', text: '', color: '', font: '' },
  { name: 'bom-dia', label: 'Bom Dia', text: 'Bom dia!', color: '#FFFFFF', font: '700 80px "Dancing Script"' },
  { name: 'boa-tarde', label: 'Boa Tarde', text: 'Boa tarde', color: '#FFFFFF', font: '700 80px "Playfair Display"' },
  { name: 'boa-noite', label: 'Boa Noite', text: 'Boa noite', color: '#fbbf24', font: '700 80px "Dancing Script"' },
  { name: 'gratidao', label: 'Gratidão', text: 'Gratidão', color: '#FFFFFF', font: '500 60px "Inter"' },
  { name: 'felicidade', label: 'Felicidade', text: 'Momentos Felizes', color: '#f472b6', font: '700 60px "Dancing Script"' },
];