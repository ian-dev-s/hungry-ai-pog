/**
 * Pet Stats Engine — manages real-time stat decay, stat interactions,
 * and offline time simulation.
 */

import { PetState } from '../data/SaveSchema';
import {
  StatName,
  HiddenStatName,
  LifeStage,
  STAT_MIN,
  STAT_MAX,
  getDecayRate,
  getStatInteractions,
} from '../data/StatsConfig';
import { IllnessEngine } from './IllnessEngine';

function clampStat(value: number): number {
  return Math.max(STAT_MIN, Math.min(STAT_MAX, value));
}

const VISIBLE_STATS: StatName[] = [
  'hunger',
  'happiness',
  'energy',
  'hygiene',
  'health',
  'bond',
  'discipline',
];

export class StatsEngine {
  private illnessEngine: IllnessEngine;

  constructor() {
    this.illnessEngine = new IllnessEngine();
  }

  /**
   * Tick stats forward by dt seconds using real-time decay.
   * Mutates petState in place and returns it for convenience.
   */
  tick(pet: PetState, dt: number): PetState {
    const stage = pet.lifeStage as LifeStage;

    // Handle illness state and effects
    this.illnessEngine.updateIllness(pet, dt);
    this.illnessEngine.applyIllnessEffects(pet, dt);

    // Apply base decay for each visible stat
    for (const stat of VISIBLE_STATS) {
      const rate = getDecayRate(stat, stage);
      if (rate > 0) {
        pet.stats[stat] = clampStat(pet.stats[stat] - rate * dt);
      }
    }

    // Apply stat interaction effects
    const interactions = getStatInteractions(pet.stats);
    for (const effect of interactions) {
      if (this.isVisibleStat(effect.stat)) {
        pet.stats[effect.stat] = clampStat(
          pet.stats[effect.stat] - effect.rate * dt,
        );
      } else if (this.isHiddenStat(effect.stat)) {
        pet.hiddenStats[effect.stat] = clampStat(
          pet.hiddenStats[effect.stat] + effect.rate * dt,
        );
      }
    }

    return pet;
  }

  /**
   * Simulate offline elapsed time by stepping in fixed increments.
   * Uses larger steps for long durations to keep computation bounded.
   */
  simulateOffline(pet: PetState, elapsedMs: number): PetState {
    const elapsedSec = elapsedMs / 1000;

    // Use adaptive step sizes: 60s steps for long offline periods
    const stepSize = elapsedSec > 3600 ? 60 : 10;
    const steps = Math.floor(elapsedSec / stepSize);
    const remainder = elapsedSec - steps * stepSize;

    for (let i = 0; i < steps; i++) {
      this.tick(pet, stepSize);
    }

    if (remainder > 0) {
      this.tick(pet, remainder);
    }

    return pet;
  }

  /** Modify a single visible stat by a delta (positive = increase). */
  modifyStat(pet: PetState, stat: StatName, delta: number): void {
    pet.stats[stat] = clampStat(pet.stats[stat] + delta);
  }

  /** Modify a hidden stat by a delta. */
  modifyHiddenStat(
    pet: PetState,
    stat: HiddenStatName,
    delta: number,
  ): void {
    pet.hiddenStats[stat] = clampStat(pet.hiddenStats[stat] + delta);
  }

  /** Set a visible stat to an exact value. */
  setStat(pet: PetState, stat: StatName, value: number): void {
    pet.stats[stat] = clampStat(value);
  }

  /** Get all visible stats as a snapshot. */
  getStats(pet: PetState): Record<StatName, number> {
    return { ...pet.stats };
  }

  /** Check if any visible stat is critically low (below threshold). */
  getCriticalStats(pet: PetState, threshold = 20): StatName[] {
    return VISIBLE_STATS.filter((s) => pet.stats[s] < threshold);
  }

  /** Get overall wellness as an average of all visible stats. */
  getWellness(pet: PetState): number {
    const sum = VISIBLE_STATS.reduce((acc, s) => acc + pet.stats[s], 0);
    return sum / VISIBLE_STATS.length;
  }

  /** Check if the pet is currently ill. */
  isIll(pet: PetState): boolean {
    return this.illnessEngine.isIll(pet);
  }

  /** Get current illness information. */
  getIllnessInfo(
    pet: PetState,
  ): { type: string; name: string; description: string; progress: number } | null {
    return this.illnessEngine.getIllnessInfo(pet);
  }

  /** Cure the pet's current illness. */
  cureIllness(pet: PetState): void {
    this.illnessEngine.cureIllness(pet);
  }

  private isVisibleStat(name: string): name is StatName {
    return VISIBLE_STATS.includes(name as StatName);
  }

  private isHiddenStat(name: string): name is HiddenStatName {
    return name === 'trust' || name === 'stress';
  }
}
