/**
 * Configuration for pet stat decay rates and interaction rules.
 * Decay rates are expressed as points lost per real-time second.
 */

export type StatName =
  | 'hunger'
  | 'happiness'
  | 'energy'
  | 'hygiene'
  | 'health'
  | 'bond'
  | 'discipline';

export type HiddenStatName = 'trust' | 'stress';

export type LifeStage =
  | 'egg'
  | 'blob'
  | 'juvenile'
  | 'adolescent'
  | 'adult'
  | 'elder';

export const STAT_MIN = 0;
export const STAT_MAX = 100;

export interface DecayRates {
  hunger: number;
  happiness: number;
  energy: number;
  hygiene: number;
  health: number;
  bond: number;
  discipline: number;
}

/** Base decay rates (points per second) — tuned for ~2-3 hours to deplete. */
const BASE_DECAY: DecayRates = {
  hunger: 0.012,
  happiness: 0.008,
  energy: 0.006,
  hygiene: 0.005,
  health: 0.0, // health only decays from interaction rules
  bond: 0.003,
  discipline: 0.004,
};

/** Multipliers per life stage applied to base decay rates. */
export const STAGE_DECAY_MULTIPLIERS: Record<LifeStage, DecayRates> = {
  egg: {
    hunger: 0,
    happiness: 0,
    energy: 0,
    hygiene: 0,
    health: 0,
    bond: 0,
    discipline: 0,
  },
  blob: {
    hunger: 1.3,
    happiness: 1.2,
    energy: 0.8,
    hygiene: 0.6,
    health: 1.0,
    bond: 1.0,
    discipline: 0.5,
  },
  juvenile: {
    hunger: 1.2,
    happiness: 1.0,
    energy: 1.0,
    hygiene: 0.8,
    health: 1.0,
    bond: 0.9,
    discipline: 0.8,
  },
  adolescent: {
    hunger: 1.0,
    happiness: 1.1,
    energy: 1.1,
    hygiene: 1.0,
    health: 1.0,
    bond: 1.2,
    discipline: 1.3,
  },
  adult: {
    hunger: 1.0,
    happiness: 1.0,
    energy: 1.0,
    hygiene: 1.0,
    health: 1.0,
    bond: 1.0,
    discipline: 1.0,
  },
  elder: {
    hunger: 0.9,
    happiness: 1.1,
    energy: 1.3,
    hygiene: 1.2,
    health: 1.2,
    bond: 0.8,
    discipline: 0.7,
  },
};

/** Get effective decay rate for a stat at a given life stage. */
export function getDecayRate(stat: StatName, stage: LifeStage): number {
  return BASE_DECAY[stat] * STAGE_DECAY_MULTIPLIERS[stage][stat];
}

/**
 * Stat interaction rules — secondary effects triggered when stats
 * drop below thresholds. Returns additional drain per second.
 */
export interface StatInteractionResult {
  stat: StatName | HiddenStatName;
  rate: number;
}

export const CRITICAL_THRESHOLD = 20;
export const LOW_THRESHOLD = 35;

export function getStatInteractions(stats: Record<StatName, number>): StatInteractionResult[] {
  const effects: StatInteractionResult[] = [];

  // Low hunger drains health
  if (stats.hunger < CRITICAL_THRESHOLD) {
    effects.push({ stat: 'health', rate: 0.015 });
  } else if (stats.hunger < LOW_THRESHOLD) {
    effects.push({ stat: 'health', rate: 0.005 });
  }

  // Low hunger drains happiness
  if (stats.hunger < LOW_THRESHOLD) {
    effects.push({ stat: 'happiness', rate: 0.004 });
  }

  // Low hygiene drains health
  if (stats.hygiene < CRITICAL_THRESHOLD) {
    effects.push({ stat: 'health', rate: 0.01 });
  } else if (stats.hygiene < LOW_THRESHOLD) {
    effects.push({ stat: 'health', rate: 0.003 });
  }

  // Low hygiene drains happiness
  if (stats.hygiene < LOW_THRESHOLD) {
    effects.push({ stat: 'happiness', rate: 0.003 });
  }

  // Low energy drains happiness
  if (stats.energy < LOW_THRESHOLD) {
    effects.push({ stat: 'happiness', rate: 0.003 });
  }

  // Low happiness increases stress
  if (stats.happiness < CRITICAL_THRESHOLD) {
    effects.push({ stat: 'stress', rate: 0.01 });
  } else if (stats.happiness < LOW_THRESHOLD) {
    effects.push({ stat: 'stress', rate: 0.004 });
  }

  // Low health increases stress
  if (stats.health < CRITICAL_THRESHOLD) {
    effects.push({ stat: 'stress', rate: 0.012 });
  }

  // Low bond drains discipline (pet stops listening)
  if (stats.bond < LOW_THRESHOLD) {
    effects.push({ stat: 'discipline', rate: 0.002 });
  }

  return effects;
}
