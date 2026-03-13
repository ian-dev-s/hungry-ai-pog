export type ColorblindMode = 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia';

export interface ColorPalette {
  primary: string;
  accent: string;
  warning: string;
  danger: string;
  success: string;
  info: string;
  muted: string;
  statHunger: string;
  statHappiness: string;
  statEnergy: string;
  statHygiene: string;
  statHealth: string;
  statBond: string;
}

export const COLOR_PALETTES: Record<ColorblindMode, ColorPalette> = {
  default: {
    primary: '#e94560',
    accent: '#4ecca3',
    warning: '#fbbf24',
    danger: '#ef4444',
    success: '#22c55e',
    info: '#87ceeb',
    muted: '#888888',
    statHunger: '#f97316',
    statHappiness: '#fbbf24',
    statEnergy: '#4ecca3',
    statHygiene: '#87ceeb',
    statHealth: '#ef4444',
    statBond: '#a78bfa',
  },
  // Protanopia: red-blind — shift reds toward blue/yellow
  protanopia: {
    primary: '#0088cc',
    accent: '#f5d800',
    warning: '#f5d800',
    danger: '#0077bb',
    success: '#f5d800',
    info: '#88ccee',
    muted: '#888888',
    statHunger: '#f5d800',
    statHappiness: '#f5d800',
    statEnergy: '#44aadd',
    statHygiene: '#88ccee',
    statHealth: '#0077bb',
    statBond: '#bb99dd',
  },
  // Deuteranopia: green-blind — shift greens toward blue/yellow
  deuteranopia: {
    primary: '#cc6600',
    accent: '#4499dd',
    warning: '#ffcc00',
    danger: '#cc4400',
    success: '#4499dd',
    info: '#aaccee',
    muted: '#888888',
    statHunger: '#ffaa00',
    statHappiness: '#ffcc00',
    statEnergy: '#4499dd',
    statHygiene: '#aaccee',
    statHealth: '#cc4400',
    statBond: '#9988cc',
  },
  // Tritanopia: blue-blind — shift blues toward red/green
  tritanopia: {
    primary: '#e94560',
    accent: '#33aa44',
    warning: '#ee7711',
    danger: '#cc2222',
    success: '#33aa44',
    info: '#99cc55',
    muted: '#888888',
    statHunger: '#ee7711',
    statHappiness: '#cccc00',
    statEnergy: '#33aa44',
    statHygiene: '#99cc55',
    statHealth: '#cc2222',
    statBond: '#aa66aa',
  },
};

export const COLORBLIND_MODE_LABELS: Record<ColorblindMode, string> = {
  default: 'Default',
  protanopia: 'Protanopia (Red-Blind)',
  deuteranopia: 'Deuteranopia (Green-Blind)',
  tritanopia: 'Tritanopia (Blue-Blind)',
};
