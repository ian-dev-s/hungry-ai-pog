/**
 * Manages pet life stage transitions and stat decay based on current stage.
 * Handles time-based progression through the 6 life stages.
 */

import {
  LifeStage,
  LIFE_STAGE_CONFIGS,
  getNextStage,
  isInteractionAvailable,
} from '@data/LifeStages';
import type { PetState } from '@data/SaveSchema';

export type StageChangeListener = (
  oldStage: LifeStage,
  newStage: LifeStage,
  pet: PetState,
) => void;

export class LifeStageManager {
  private stageChangeListeners: StageChangeListener[] = [];

  /** Register a listener for stage transitions. */
  onStageChange(listener: StageChangeListener): () => void {
    this.stageChangeListeners.push(listener);
    return () => {
      this.stageChangeListeners = this.stageChangeListeners.filter(
        (l) => l !== listener,
      );
    };
  }

  /**
   * Update a pet's stats and check for stage transition.
   * @param pet The current pet state (mutated in place).
   * @param dtSeconds Delta time in seconds.
   * @param now Current timestamp in ms.
   * @returns true if a stage transition occurred.
   */
  update(pet: PetState, dtSeconds: number, now: number): boolean {
    const stage = pet.lifeStage as LifeStage;
    const config = LIFE_STAGE_CONFIGS[stage];
    if (!config) return false;

    // Apply stat decay
    this.applyDecay(pet, config.decayRates, dtSeconds);

    // Check for stage advancement
    if (config.duration !== null) {
      const elapsed = now - pet.stageStartTimestamp;
      if (elapsed >= config.duration) {
        return this.advanceStage(pet, now);
      }
    }

    return false;
  }

  /** Check if a specific interaction is available for the pet's current stage. */
  canInteract(pet: PetState, interaction: string): boolean {
    return isInteractionAvailable(pet.lifeStage as LifeStage, interaction);
  }

  /** Get the progress (0-1) through the current life stage. */
  getStageProgress(pet: PetState, now: number): number {
    const config = LIFE_STAGE_CONFIGS[pet.lifeStage as LifeStage];
    if (!config || config.duration === null) return 1;
    const elapsed = now - pet.stageStartTimestamp;
    return Math.min(1, Math.max(0, elapsed / config.duration));
  }

  /** Get time remaining in current stage in ms, or null for final stage. */
  getTimeRemaining(pet: PetState, now: number): number | null {
    const config = LIFE_STAGE_CONFIGS[pet.lifeStage as LifeStage];
    if (!config || config.duration === null) return null;
    const elapsed = now - pet.stageStartTimestamp;
    return Math.max(0, config.duration - elapsed);
  }

  /** Force advance to the next stage (e.g., for egg hatching). */
  forceAdvance(pet: PetState, now: number): boolean {
    return this.advanceStage(pet, now);
  }

  private advanceStage(pet: PetState, now: number): boolean {
    const current = pet.lifeStage as LifeStage;
    const next = getNextStage(current);
    if (!next) return false;

    pet.lifeStage = next;
    pet.stageStartTimestamp = now;

    for (const listener of this.stageChangeListeners) {
      listener(current, next, pet);
    }

    return true;
  }

  private applyDecay(
    pet: PetState,
    rates: Record<string, number>,
    dtSeconds: number,
  ): void {
    const stats = pet.stats;
    for (const key of Object.keys(rates) as Array<keyof typeof stats>) {
      const rate = rates[key];
      if (rate > 0) {
        stats[key] = Math.max(0, stats[key] - rate * dtSeconds);
      }
    }
  }
}
