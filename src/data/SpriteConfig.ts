/**
 * Configuration for procedural pixel-art sprites.
 * Defines colors, shapes, and animation frames per life stage and pet state.
 */

export type PetAnimState =
  | 'idle'
  | 'eating'
  | 'playing'
  | 'sleeping'
  | 'sick'
  | 'happy'
  | 'sad';

export type LifeStageSprite = 'blob' | 'juvenile' | 'adolescent' | 'adult' | 'elder';

export interface SpriteFrame {
  /** Body scale modifier (1 = normal). */
  bodyScale: number;
  /** Y offset for bounce/squash animation. */
  yOffset: number;
  /** Eye state: open, half, closed, sparkle, x. */
  eyeState: 'open' | 'half' | 'closed' | 'sparkle' | 'x';
  /** Mouth state: none, smile, open, frown, o. */
  mouth: 'none' | 'smile' | 'open' | 'frown' | 'o';
  /** Rotation in radians (for wiggle effects). */
  rotation: number;
  /** Extra appendage animation phase (0-1). */
  appendagePhase: number;
}

export interface ElementColors {
  body: string;
  accent: string;
  highlight: string;
  shadow: string;
}

export const ELEMENT_COLORS: Record<string, ElementColors> = {
  forest: { body: '#4ecca3', accent: '#2d8a6e', highlight: '#7fffcf', shadow: '#1a5c3f' },
  aquatic: { body: '#4da6ff', accent: '#2563eb', highlight: '#93c5fd', shadow: '#1e40af' },
  fire: { body: '#f97316', accent: '#dc2626', highlight: '#fbbf24', shadow: '#991b1b' },
  cosmic: { body: '#a78bfa', accent: '#7c3aed', highlight: '#ddd6fe', shadow: '#4c1d95' },
  shadow: { body: '#6b7280', accent: '#374151', highlight: '#d1d5db', shadow: '#111827' },
  crystal: { body: '#e0f2fe', accent: '#67e8f9', highlight: '#ffffff', shadow: '#0e7490' },
};

export const STAGE_DIMENSIONS: Record<LifeStageSprite, { width: number; height: number; eyeSize: number }> = {
  blob: { width: 32, height: 28, eyeSize: 5 },
  juvenile: { width: 40, height: 38, eyeSize: 6 },
  adolescent: { width: 48, height: 50, eyeSize: 7 },
  adult: { width: 56, height: 60, eyeSize: 8 },
  elder: { width: 52, height: 56, eyeSize: 7 },
};

/** Animation frame counts per state at 60fps. */
export const ANIM_FRAME_COUNTS: Record<PetAnimState, number> = {
  idle: 4,
  eating: 6,
  playing: 8,
  sleeping: 4,
  sick: 4,
  happy: 6,
  sad: 4,
};

/** Frames per animation frame (lower = faster). */
export const ANIM_SPEED: Record<PetAnimState, number> = {
  idle: 15,
  eating: 8,
  playing: 6,
  sleeping: 20,
  sick: 18,
  happy: 8,
  sad: 16,
};

export function getLifeStageSprite(lifeStage: string): LifeStageSprite {
  const map: Record<string, LifeStageSprite> = {
    blob: 'blob',
    juvenile: 'juvenile',
    adolescent: 'adolescent',
    adult: 'adult',
    elder: 'elder',
  };
  return map[lifeStage] ?? 'blob';
}
