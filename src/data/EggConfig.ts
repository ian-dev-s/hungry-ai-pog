/**
 * Egg configuration: elemental categories, interaction effects,
 * hatch thresholds, and visual stage definitions.
 */

// ─── Elemental Categories ────────────────────────────────────────────────────

export type EggElement = 'forest' | 'aquatic' | 'fire' | 'cosmic' | 'shadow' | 'crystal';

export interface EggTypeConfig {
  id: string;
  element: EggElement;
  name: string;
  description: string;
  /** Base color used for rendering the egg. */
  baseColor: string;
  /** Accent color for patterns and glow effects. */
  accentColor: string;
  /** Multipliers applied to interaction effects for this egg type. */
  interactionMultipliers: Record<EggInteractionType, number>;
}

export const EGG_TYPES: Record<EggElement, EggTypeConfig> = {
  forest: {
    id: 'egg_forest',
    element: 'forest',
    name: 'Verdant Egg',
    description: 'A mossy green egg that hums with the energy of ancient woods.',
    baseColor: '#2d6a4f',
    accentColor: '#95d5b2',
    interactionMultipliers: { tap: 1.0, warm: 1.2, talk: 1.1 },
  },
  aquatic: {
    id: 'egg_aquatic',
    element: 'aquatic',
    name: 'Tidal Egg',
    description: 'A shimmering blue egg that ripples like calm water.',
    baseColor: '#0077b6',
    accentColor: '#90e0ef',
    interactionMultipliers: { tap: 0.9, warm: 1.0, talk: 1.3 },
  },
  fire: {
    id: 'egg_fire',
    element: 'fire',
    name: 'Ember Egg',
    description: 'A warm, smoldering egg that glows faintly in the dark.',
    baseColor: '#d62828',
    accentColor: '#fcbf49',
    interactionMultipliers: { tap: 1.2, warm: 1.3, talk: 0.8 },
  },
  cosmic: {
    id: 'egg_cosmic',
    element: 'cosmic',
    name: 'Astral Egg',
    description: 'A dark egg flecked with tiny points of starlight.',
    baseColor: '#240046',
    accentColor: '#c77dff',
    interactionMultipliers: { tap: 1.1, warm: 0.9, talk: 1.2 },
  },
  shadow: {
    id: 'egg_shadow',
    element: 'shadow',
    name: 'Umbral Egg',
    description: 'A void-dark egg that absorbs nearby light.',
    baseColor: '#1b1b2f',
    accentColor: '#6c63ff',
    interactionMultipliers: { tap: 1.3, warm: 0.7, talk: 1.1 },
  },
  crystal: {
    id: 'egg_crystal',
    element: 'crystal',
    name: 'Prismatic Egg',
    description: 'A translucent egg that refracts light into rainbows.',
    baseColor: '#ced4da',
    accentColor: '#f72585',
    interactionMultipliers: { tap: 0.8, warm: 1.1, talk: 1.3 },
  },
};

// ─── Interaction Types & Effects ─────────────────────────────────────────────

export type EggInteractionType = 'tap' | 'warm' | 'talk';

export interface EggInteractionEffect {
  /** Progress points added toward hatching per interaction. */
  progressPoints: number;
  /** Influence on initial personality axes [curiosity, energy, social, patience]. */
  personalityInfluence: [number, number, number, number];
  /** Influence on initial hidden stats. */
  statInfluence: {
    trust: number;
    bond: number;
  };
  /** Cooldown in ms before this interaction has full effect again. */
  cooldownMs: number;
}

export const EGG_INTERACTION_EFFECTS: Record<EggInteractionType, EggInteractionEffect> = {
  tap: {
    progressPoints: 3,
    personalityInfluence: [0.02, 0.03, 0.0, -0.01],
    statInfluence: { trust: 1, bond: 2 },
    cooldownMs: 2_000,
  },
  warm: {
    progressPoints: 5,
    personalityInfluence: [0.0, -0.01, 0.02, 0.03],
    statInfluence: { trust: 3, bond: 1 },
    cooldownMs: 5_000,
  },
  talk: {
    progressPoints: 4,
    personalityInfluence: [0.01, 0.0, 0.04, 0.01],
    statInfluence: { trust: 2, bond: 3 },
    cooldownMs: 3_000,
  },
};

// ─── Hatch Thresholds ────────────────────────────────────────────────────────

export interface HatchThresholds {
  /** Minimum interaction progress points required to hatch. */
  minInteractionProgress: number;
  /** Minimum wall-clock time (ms) since egg was obtained before it can hatch. */
  minWallClockMs: number;
  /** Maximum wall-clock time (ms) — egg auto-hatches even without enough interaction. */
  maxWallClockMs: number;
}

/** One minute in ms. */
const MINUTE = 60_000;
/** One hour in ms. */
const HOUR = 3_600_000;

export const DEFAULT_HATCH_THRESHOLDS: HatchThresholds = {
  minInteractionProgress: 100,
  minWallClockMs: 30 * MINUTE,
  maxWallClockMs: 2 * HOUR,
};

// ─── Egg Visual Stages ──────────────────────────────────────────────────────

export interface EggVisualStage {
  /** Minimum hatch progress (0-1) to enter this visual stage. */
  minProgress: number;
  /** Label for this visual stage. */
  label: string;
  /** Whether the egg wobbles at this stage. */
  wobble: boolean;
  /** Whether the egg glows at this stage. */
  glow: boolean;
  /** Number of cracks shown (0-3). */
  cracks: number;
}

export const EGG_VISUAL_STAGES: EggVisualStage[] = [
  { minProgress: 0.0, label: 'dormant', wobble: false, glow: false, cracks: 0 },
  { minProgress: 0.25, label: 'stirring', wobble: true, glow: false, cracks: 0 },
  { minProgress: 0.5, label: 'glowing', wobble: true, glow: true, cracks: 1 },
  { minProgress: 0.75, label: 'cracking', wobble: true, glow: true, cracks: 2 },
  { minProgress: 0.95, label: 'hatching', wobble: true, glow: true, cracks: 3 },
];

/** Get the current visual stage for a given hatch progress (0-1). */
export function getEggVisualStage(progress: number): EggVisualStage {
  let result = EGG_VISUAL_STAGES[0];
  for (const stage of EGG_VISUAL_STAGES) {
    if (progress >= stage.minProgress) {
      result = stage;
    }
  }
  return result;
}

// ─── Egg Save State ─────────────────────────────────────────────────────────

export interface EggState {
  /** The selected egg element type. */
  element: EggElement;
  /** Timestamp when the egg was obtained. */
  obtainedTimestamp: number;
  /** Accumulated interaction progress points. */
  interactionProgress: number;
  /** Cumulative personality influence from interactions. */
  personalityAccumulator: [number, number, number, number];
  /** Cumulative stat influence from interactions. */
  statAccumulator: { trust: number; bond: number };
  /** Total number of interactions performed. */
  totalInteractions: number;
  /** Timestamps of last interaction by type (for cooldown). */
  lastInteractionTimestamps: Record<EggInteractionType, number>;
  /** Whether the egg has hatched. */
  hatched: boolean;
}

export function createDefaultEggState(element: EggElement, now: number): EggState {
  return {
    element,
    obtainedTimestamp: now,
    interactionProgress: 0,
    personalityAccumulator: [0.5, 0.5, 0.5, 0.5],
    statAccumulator: { trust: 50, bond: 50 },
    totalInteractions: 0,
    lastInteractionTimestamps: { tap: 0, warm: 0, talk: 0 },
    hatched: false,
  };
}

export const ALL_EGG_ELEMENTS: EggElement[] = [
  'forest',
  'aquatic',
  'fire',
  'cosmic',
  'shadow',
  'crystal',
];
