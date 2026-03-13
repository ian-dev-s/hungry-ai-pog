/**
 * Legacy trait definitions for the elder pet retirement system.
 * When a pet reaches Elder stage and retires, it can leave a Legacy Egg
 * that inherits one trait or stat bonus for the next generation.
 */

export type LegacyTraitId =
  | 'happy_spirit'
  | 'iron_will'
  | 'social_heart'
  | 'vitality'
  | 'keen_mind'
  | 'swift_body'
  | 'clean_soul'
  | 'balanced_nature';

export interface StatBonus {
  hunger?: number;
  happiness?: number;
  energy?: number;
  hygiene?: number;
  health?: number;
  bond?: number;
  discipline?: number;
}

export interface LegacyTrait {
  id: LegacyTraitId;
  name: string;
  description: string;
  /** Stat bonuses applied to the new pet at hatch. Values are flat additions (0-100 scale). */
  bonus: StatBonus;
  /** The primary pet stat that determines eligibility for this trait. */
  primaryStat: keyof StatBonus;
  /** Minimum value of the primary stat required for this trait to be eligible. */
  minStatValue: number;
}

export const LEGACY_TRAITS: Record<LegacyTraitId, LegacyTrait> = {
  happy_spirit: {
    id: 'happy_spirit',
    name: 'Happy Spirit',
    description: 'A radiant joy passed down through generations, lifting the mood of any new life.',
    bonus: { happiness: 10, bond: 5 },
    primaryStat: 'happiness',
    minStatValue: 70,
  },
  iron_will: {
    id: 'iron_will',
    name: 'Iron Will',
    description: 'Forged discipline echoes into the next generation, granting resilience from birth.',
    bonus: { discipline: 10, health: 5 },
    primaryStat: 'discipline',
    minStatValue: 70,
  },
  social_heart: {
    id: 'social_heart',
    name: 'Social Heart',
    description: 'A legacy of deep bonds, ensuring the next pet starts life with warmth and trust.',
    bonus: { bond: 10, happiness: 5 },
    primaryStat: 'bond',
    minStatValue: 70,
  },
  vitality: {
    id: 'vitality',
    name: 'Vitality',
    description: 'Robust health inherited across the family line, granting a head start on wellness.',
    bonus: { health: 10, energy: 5 },
    primaryStat: 'health',
    minStatValue: 70,
  },
  keen_mind: {
    id: 'keen_mind',
    name: 'Keen Mind',
    description: 'Sharp instincts passed down, giving the new pet an energetic curiosity from the start.',
    bonus: { energy: 10, discipline: 5 },
    primaryStat: 'energy',
    minStatValue: 70,
  },
  swift_body: {
    id: 'swift_body',
    name: 'Swift Body',
    description: 'An ancestor\'s boundless hunger for life, keeping the next pet well-fed and energized.',
    bonus: { hunger: 10, energy: 5 },
    primaryStat: 'hunger',
    minStatValue: 70,
  },
  clean_soul: {
    id: 'clean_soul',
    name: 'Clean Soul',
    description: 'An immaculate lineage. The next pet inherits pristine habits from day one.',
    bonus: { hygiene: 10, health: 5 },
    primaryStat: 'hygiene',
    minStatValue: 70,
  },
  balanced_nature: {
    id: 'balanced_nature',
    name: 'Balanced Nature',
    description: 'A rare gift from a perfectly cared-for elder. Small bonuses across all stats.',
    bonus: { happiness: 5, health: 5, bond: 5, energy: 5 },
    primaryStat: 'happiness',
    minStatValue: 0,
  },
};

export const ALL_LEGACY_TRAITS: LegacyTrait[] = Object.values(LEGACY_TRAITS);

/** Stat keys that can be evaluated for legacy trait selection. */
export const LEGACY_STAT_KEYS: Array<keyof StatBonus> = [
  'happiness',
  'discipline',
  'bond',
  'health',
  'energy',
  'hunger',
  'hygiene',
];
