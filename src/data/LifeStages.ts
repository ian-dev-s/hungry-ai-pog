/**
 * Life stage definitions, durations, stat decay rates, and available interactions.
 */

export enum LifeStage {
  Egg = 'egg',
  Blob = 'blob',
  Juvenile = 'juvenile',
  Adolescent = 'adolescent',
  Adult = 'adult',
  Elder = 'elder',
}

export const LIFE_STAGE_ORDER: LifeStage[] = [
  LifeStage.Egg,
  LifeStage.Blob,
  LifeStage.Juvenile,
  LifeStage.Adolescent,
  LifeStage.Adult,
  LifeStage.Elder,
];

export interface StatDecayRates {
  hunger: number;
  happiness: number;
  energy: number;
  hygiene: number;
  health: number;
  bond: number;
  discipline: number;
}

export interface LifeStageConfig {
  stage: LifeStage;
  /** Duration in milliseconds before advancing to next stage. null = final stage. */
  duration: number | null;
  /** Stat decay per second (points lost per second). */
  decayRates: StatDecayRates;
  /** Interactions available at this stage. */
  availableInteractions: string[];
}

/** One hour in ms */
const HOUR = 3_600_000;

export const LIFE_STAGE_CONFIGS: Record<LifeStage, LifeStageConfig> = {
  [LifeStage.Egg]: {
    stage: LifeStage.Egg,
    duration: 2 * HOUR,
    decayRates: {
      hunger: 0,
      happiness: 0,
      energy: 0,
      hygiene: 0,
      health: 0,
      bond: 0,
      discipline: 0,
    },
    availableInteractions: ['tap', 'warm', 'talk'],
  },
  [LifeStage.Blob]: {
    stage: LifeStage.Blob,
    duration: 6 * HOUR,
    decayRates: {
      hunger: 0.02,
      happiness: 0.015,
      energy: 0.01,
      hygiene: 0.008,
      health: 0.005,
      bond: 0.01,
      discipline: 0,
    },
    availableInteractions: ['feed', 'pet', 'clean', 'sleep'],
  },
  [LifeStage.Juvenile]: {
    stage: LifeStage.Juvenile,
    duration: 12 * HOUR,
    decayRates: {
      hunger: 0.025,
      happiness: 0.02,
      energy: 0.015,
      hygiene: 0.012,
      health: 0.005,
      bond: 0.012,
      discipline: 0.01,
    },
    availableInteractions: ['feed', 'pet', 'clean', 'sleep', 'play', 'train', 'medicine'],
  },
  [LifeStage.Adolescent]: {
    stage: LifeStage.Adolescent,
    duration: 24 * HOUR,
    decayRates: {
      hunger: 0.03,
      happiness: 0.025,
      energy: 0.02,
      hygiene: 0.015,
      health: 0.008,
      bond: 0.015,
      discipline: 0.02,
    },
    availableInteractions: [
      'feed', 'pet', 'clean', 'sleep', 'play', 'train',
      'medicine', 'explore', 'minigame',
    ],
  },
  [LifeStage.Adult]: {
    stage: LifeStage.Adult,
    duration: 72 * HOUR,
    decayRates: {
      hunger: 0.02,
      happiness: 0.015,
      energy: 0.012,
      hygiene: 0.01,
      health: 0.006,
      bond: 0.01,
      discipline: 0.008,
    },
    availableInteractions: [
      'feed', 'pet', 'clean', 'sleep', 'play', 'train',
      'medicine', 'explore', 'minigame', 'craft',
    ],
  },
  [LifeStage.Elder]: {
    stage: LifeStage.Elder,
    duration: null,
    decayRates: {
      hunger: 0.015,
      happiness: 0.01,
      energy: 0.025,
      hygiene: 0.012,
      health: 0.015,
      bond: 0.005,
      discipline: 0.005,
    },
    availableInteractions: [
      'feed', 'pet', 'clean', 'sleep', 'play', 'train',
      'medicine', 'explore', 'minigame', 'craft', 'legacy',
    ],
  },
};

/** Get the next life stage, or null if at the final stage. */
export function getNextStage(current: LifeStage): LifeStage | null {
  const idx = LIFE_STAGE_ORDER.indexOf(current);
  if (idx === -1 || idx >= LIFE_STAGE_ORDER.length - 1) return null;
  return LIFE_STAGE_ORDER[idx + 1];
}

/** Check if an interaction is available at a given life stage. */
export function isInteractionAvailable(stage: LifeStage, interaction: string): boolean {
  const config = LIFE_STAGE_CONFIGS[stage];
  return config.availableInteractions.includes(interaction);
}
