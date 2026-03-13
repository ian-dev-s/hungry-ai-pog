/**
 * Configuration for the mini-games suite.
 * Defines game metadata, unlock stages, stat effects, and coin rewards.
 */

import type { LifeStage } from './StatsConfig';

export type MiniGameId = 'fetch' | 'puzzle-box' | 'dance-off' | 'hide-and-seek' | 'art-canvas';

export interface MiniGameDef {
  id: MiniGameId;
  name: string;
  description: string;
  unlockStage: LifeStage;
  /** Stats modified on completion: positive = boost */
  statEffects: Partial<Record<string, number>>;
  /** Base coin reward — multiplied by score percentage */
  baseCoins: number;
  /** Duration in seconds (0 = untimed) */
  duration: number;
}

export const MINI_GAMES: Record<MiniGameId, MiniGameDef> = {
  fetch: {
    id: 'fetch',
    name: 'Fetch',
    description: 'Timing-based throw & catch',
    unlockStage: 'blob',
    statEffects: { happiness: 15, energy: -10 },
    baseCoins: 10,
    duration: 30,
  },
  'puzzle-box': {
    id: 'puzzle-box',
    name: 'Puzzle Box',
    description: 'Match the pattern sequence',
    unlockStage: 'juvenile',
    statEffects: { discipline: 12 },
    baseCoins: 15,
    duration: 45,
  },
  'dance-off': {
    id: 'dance-off',
    name: 'Dance-Off',
    description: 'Hit the rhythm beats',
    unlockStage: 'juvenile',
    statEffects: { happiness: 18, bond: 8, energy: -12 },
    baseCoins: 20,
    duration: 30,
  },
  'hide-and-seek': {
    id: 'hide-and-seek',
    name: 'Hide & Seek',
    description: 'Find the hidden pet',
    unlockStage: 'adolescent',
    statEffects: { bond: 15, happiness: 8 },
    baseCoins: 12,
    duration: 20,
  },
  'art-canvas': {
    id: 'art-canvas',
    name: 'Art Canvas',
    description: 'Draw with your pet',
    unlockStage: 'blob',
    statEffects: { happiness: 10, bond: 5 },
    baseCoins: 8,
    duration: 0, // untimed
  },
};

/** Order of life stages for comparison */
const STAGE_ORDER: LifeStage[] = ['egg', 'blob', 'juvenile', 'adolescent', 'adult', 'elder'];

export function isStageAtLeast(current: LifeStage, required: LifeStage): boolean {
  return STAGE_ORDER.indexOf(current) >= STAGE_ORDER.indexOf(required);
}

/** Performance multiplier based on pet mood (happiness) and energy */
export function getPerformanceMultiplier(happiness: number, energy: number): number {
  const moodFactor = happiness >= 60 ? 1.2 : happiness >= 30 ? 1.0 : 0.7;
  const energyFactor = energy >= 50 ? 1.1 : energy >= 25 ? 1.0 : 0.8;
  return moodFactor * energyFactor;
}

export const ALL_GAME_IDS: MiniGameId[] = ['fetch', 'puzzle-box', 'dance-off', 'hide-and-seek', 'art-canvas'];
