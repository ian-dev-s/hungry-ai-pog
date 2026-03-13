/**
 * Hygiene System — manages bathing, grooming, and dirt accumulation.
 *
 * Dirt builds up over time. Bathing involves three phases (scrub, rinse, dry)
 * with player interaction. Grooming unlocks at juvenile stage.
 * Pet reacts to water temperature based on personality and element type.
 */

import {
  PetState,
  BathPhase,
  WaterTemperature,
} from '../data/SaveSchema';
import { LifeStage } from '../data/StatsConfig';
import {
  DIRT_ACCUMULATION_RATE,
  HEAVY_DIRT_THRESHOLD,
  HEAVY_DIRT_HYGIENE_DRAIN,
  BATH_PHASE_ORDER,
  PROGRESS_PER_INTERACTION,
  PHASE_COMPLETION,
  BATH_HYGIENE_RESTORE,
  BATH_DIRT_REDUCTION,
  TEMP_PREFERENCE_BONUS,
  TEMP_PREFERENCE_PENALTY,
  getPreferredTemperature,
  GROOMABLE_STAGES,
  GROOMING_HYGIENE_BONUS,
  GROOMING_HAPPINESS_BONUS,
  GROOMING_BOND_BONUS,
} from '../data/HygieneConfig';

export interface BathResult {
  completed: boolean;
  hygieneRestored: number;
  happinessChange: number;
  bondChange: number;
}

export class HygieneSystem {
  /**
   * Tick dirt accumulation and hygiene drain from heavy dirt.
   * Called each frame with delta time in seconds.
   */
  tick(pet: PetState, dt: number): void {
    const hygiene = pet.hygieneCare;

    // Don't accumulate dirt during a bath
    if (hygiene.bathPhase !== 'idle' && hygiene.bathPhase !== 'done') {
      return;
    }

    // Accumulate dirt over time
    hygiene.dirtLevel = clamp(hygiene.dirtLevel + DIRT_ACCUMULATION_RATE * dt, 0, 100);

    // Extra hygiene drain when heavily dirty
    if (hygiene.dirtLevel >= HEAVY_DIRT_THRESHOLD) {
      pet.stats.hygiene = clamp(
        pet.stats.hygiene - HEAVY_DIRT_HYGIENE_DRAIN * dt,
        0,
        100,
      );
    }
  }

  /**
   * Start a bath session. Sets phase to 'scrub'.
   */
  startBath(pet: PetState, temperature: WaterTemperature): { started: boolean; reason?: string } {
    if (pet.hygieneCare.bathPhase !== 'idle' && pet.hygieneCare.bathPhase !== 'done') {
      return { started: false, reason: 'Bath already in progress' };
    }

    pet.hygieneCare.bathPhase = 'scrub';
    pet.hygieneCare.bathProgress = 0;

    // Apply temperature preference reaction
    const preferred = getPreferredTemperature(
      pet.hiddenStats.personality,
      pet.elementType,
    );

    if (temperature === preferred) {
      pet.stats.happiness = clamp(pet.stats.happiness + TEMP_PREFERENCE_BONUS, 0, 100);
    } else {
      pet.stats.happiness = clamp(pet.stats.happiness + TEMP_PREFERENCE_PENALTY, 0, 100);
    }

    return { started: true };
  }

  /**
   * Player interaction during bath (tap/click).
   * Advances progress in the current bath phase.
   * Returns result when bath is complete.
   */
  interact(pet: PetState, now: number): BathResult | null {
    const hygiene = pet.hygieneCare;
    const phase = hygiene.bathPhase;

    if (phase === 'idle' || phase === 'done') {
      return null;
    }

    hygiene.bathProgress += PROGRESS_PER_INTERACTION;

    if (hygiene.bathProgress >= PHASE_COMPLETION) {
      // Advance to next phase
      const currentIndex = BATH_PHASE_ORDER.indexOf(phase);
      const nextIndex = currentIndex + 1;

      if (nextIndex >= BATH_PHASE_ORDER.length) {
        // Bath complete
        return this.completeBath(pet, now);
      }

      hygiene.bathPhase = BATH_PHASE_ORDER[nextIndex];
      hygiene.bathProgress = 0;
    }

    return null;
  }

  /**
   * Check if grooming is available for this pet's life stage.
   */
  canGroom(pet: PetState): boolean {
    const stage = pet.lifeStage as LifeStage;
    return GROOMABLE_STAGES.includes(stage);
  }

  /**
   * Groom the pet (available at juvenile+ stages).
   * Boosts hygiene, happiness, and bond.
   */
  groom(pet: PetState): { success: boolean; reason?: string } {
    if (!this.canGroom(pet)) {
      return { success: false, reason: 'Pet is too young to groom' };
    }

    if (pet.hygieneCare.groomed) {
      return { success: false, reason: 'Pet has already been groomed' };
    }

    pet.stats.hygiene = clamp(pet.stats.hygiene + GROOMING_HYGIENE_BONUS, 0, 100);
    pet.stats.happiness = clamp(pet.stats.happiness + GROOMING_HAPPINESS_BONUS, 0, 100);
    pet.stats.bond = clamp(pet.stats.bond + GROOMING_BOND_BONUS, 0, 100);
    pet.hygieneCare.groomed = true;

    return { success: true };
  }

  /**
   * Reset grooming flag (called at start of new day).
   */
  resetDailyGrooming(pet: PetState): void {
    pet.hygieneCare.groomed = false;
  }

  /**
   * Get current dirt level.
   */
  getDirtLevel(pet: PetState): number {
    return pet.hygieneCare.dirtLevel;
  }

  /**
   * Check if pet has visible dirt.
   */
  isVisiblyDirty(pet: PetState): boolean {
    return pet.hygieneCare.dirtLevel >= 40;
  }

  /**
   * Get the current bath phase.
   */
  getBathPhase(pet: PetState): BathPhase {
    return pet.hygieneCare.bathPhase;
  }

  private completeBath(pet: PetState, now: number): BathResult {
    const hygieneRestored = BATH_HYGIENE_RESTORE;
    const happinessChange = 8;
    const bondChange = 5;

    pet.stats.hygiene = clamp(pet.stats.hygiene + hygieneRestored, 0, 100);
    pet.stats.happiness = clamp(pet.stats.happiness + happinessChange, 0, 100);
    pet.stats.bond = clamp(pet.stats.bond + bondChange, 0, 100);

    pet.hygieneCare.dirtLevel = clamp(
      pet.hygieneCare.dirtLevel - BATH_DIRT_REDUCTION,
      0,
      100,
    );
    pet.hygieneCare.bathPhase = 'done';
    pet.hygieneCare.bathProgress = 0;
    pet.hygieneCare.lastBathTimestamp = now;

    return {
      completed: true,
      hygieneRestored,
      happinessChange,
      bondChange,
    };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
