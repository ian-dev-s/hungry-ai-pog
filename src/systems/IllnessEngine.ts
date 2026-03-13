/**
 * Illness Engine — manages pet illnesses, their effects, and recovery.
 */

import { PetState } from '../data/SaveSchema';
import { IllnessType, ILLNESS_DEFINITIONS, selectRandomIllness, getIllnessDefinition } from '../data/IllnessConfig';

const HEALTH_CRITICAL_THRESHOLD = 20;

export class IllnessEngine {
  /**
   * Check if the pet should contract an illness and apply it.
   * Called from StatsEngine tick to detect critical health states.
   */
  updateIllness(pet: PetState, dt: number): void {
    // If already ill, handle recovery/duration
    if (pet.illness.type) {
      this.updateExistingIllness(pet, dt);
    } else if (pet.stats.health < HEALTH_CRITICAL_THRESHOLD) {
      // Chance to contract new illness if health is critical
      this.tryContractIllness(pet);
    }
  }

  /**
   * Apply active illness effects to the pet's stats.
   */
  applyIllnessEffects(pet: PetState, dt: number): void {
    if (!pet.illness.type) {
      return;
    }

    const definition = getIllnessDefinition(pet.illness.type);
    if (!definition) {
      return;
    }

    // Apply health drain
    pet.stats.health = Math.max(0, pet.stats.health - definition.healthDrainRate * dt);

    // Apply happiness drain
    pet.stats.happiness = Math.max(0, pet.stats.happiness - definition.happinessDrainRate * dt);
  }

  /**
   * Check if illness duration has expired and remove it.
   */
  private updateExistingIllness(pet: PetState, dt: number): void {
    if (!pet.illness.startTimestamp) {
      return;
    }

    const definition = getIllnessDefinition(pet.illness.type);
    if (!definition) {
      pet.illness.type = null;
      pet.illness.startTimestamp = null;
      return;
    }

    const elapsedSeconds = (Date.now() - pet.illness.startTimestamp) / 1000;
    if (elapsedSeconds > definition.durationSeconds) {
      // Illness has run its course
      pet.illness.type = null;
      pet.illness.startTimestamp = null;
    }
  }

  /**
   * Attempt to contract a new illness when health is critically low.
   * Uses a probability-based system to prevent guaranteed illness.
   */
  private tryContractIllness(pet: PetState): void {
    // 15% chance per tick when health is critical
    if (Math.random() > 0.15) {
      return;
    }

    const newIllness = selectRandomIllness(Math.random());
    pet.illness.type = newIllness;
    pet.illness.startTimestamp = Date.now();
  }

  /**
   * Cure the pet's current illness (e.g., via medicine).
   */
  cureIllness(pet: PetState): void {
    pet.illness.type = null;
    pet.illness.startTimestamp = null;
  }

  /**
   * Check if the pet is currently ill.
   */
  isIll(pet: PetState): boolean {
    return pet.illness.type !== null;
  }

  /**
   * Get the current illness type, if any.
   */
  getCurrentIllness(pet: PetState): IllnessType | null {
    return pet.illness.type as IllnessType | null;
  }

  /**
   * Get detailed info about the current illness.
   */
  getIllnessInfo(pet: PetState): { type: string; name: string; description: string; progress: number } | null {
    if (!pet.illness.type || !pet.illness.startTimestamp) {
      return null;
    }

    const definition = getIllnessDefinition(pet.illness.type);
    if (!definition) {
      return null;
    }

    const elapsedSeconds = (Date.now() - pet.illness.startTimestamp) / 1000;
    const progress = Math.min(1, elapsedSeconds / definition.durationSeconds);

    return {
      type: pet.illness.type,
      name: definition.name,
      description: definition.description,
      progress,
    };
  }
}
