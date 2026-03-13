/**
 * Sleep System — manages pet sleep cycles synced to player timezone.
 *
 * Pets naturally get drowsy at night and wake in the morning.
 * Players can manually put pets to bed. Sleep recovers energy
 * and reduces stress. Forcing a pet awake increases stress.
 * Timid pets benefit from a nightlight.
 */

import { PetState, SleepPhase } from '../data/SaveSchema';
import {
  DROWSY_START_HOUR,
  WAKE_HOUR,
  SLEEP_ENERGY_RECOVERY,
  DEEP_SLEEP_ENERGY_RECOVERY,
  SLEEP_HAPPINESS_RECOVERY,
  SLEEP_STRESS_REDUCTION,
  SLEEP_DECAY_MULTIPLIER,
  FORCE_WAKE_STRESS,
  FORCE_WAKE_HAPPINESS_PENALTY,
  FORCE_WAKE_BOND_PENALTY,
  MIN_SLEEP_DURATION,
  PHASE_DURATIONS,
  TIMID_THRESHOLD,
  NIGHTLIGHT_STRESS_BONUS,
  getDreamMood,
} from '../data/SleepConfig';

export class SleepSystem {
  /**
   * Tick the sleep system forward by dt seconds.
   * Handles phase transitions, energy recovery, and stress reduction.
   */
  tick(pet: PetState, dt: number, now: number): void {
    const hour = new Date(now).getHours();

    if (this.isSleeping(pet)) {
      this.tickSleeping(pet, dt, now);
    } else {
      this.tickAwake(pet, hour);
    }
  }

  /**
   * Check if the pet is currently sleeping (any non-awake phase).
   */
  isSleeping(pet: PetState): boolean {
    return pet.sleep.phase !== 'awake';
  }

  /**
   * Put the pet to bed manually.
   */
  putToBed(pet: PetState, now: number): { success: boolean; reason?: string } {
    if (this.isSleeping(pet)) {
      return { success: false, reason: 'Pet is already sleeping' };
    }

    pet.sleep.phase = 'drowsy';
    pet.sleep.sleepStartTimestamp = now;
    pet.sleep.wasForced = true;
    pet.sleep.dreamMood = null;

    return { success: true };
  }

  /**
   * Force the pet awake. Increases stress and reduces happiness.
   */
  forceWake(pet: PetState): { success: boolean; reason?: string } {
    if (!this.isSleeping(pet)) {
      return { success: false, reason: 'Pet is already awake' };
    }

    pet.hiddenStats.stress = clamp(
      pet.hiddenStats.stress + FORCE_WAKE_STRESS,
      0,
      100,
    );
    pet.stats.happiness = clamp(
      pet.stats.happiness + FORCE_WAKE_HAPPINESS_PENALTY,
      0,
      100,
    );
    pet.stats.bond = clamp(
      pet.stats.bond + FORCE_WAKE_BOND_PENALTY,
      0,
      100,
    );

    this.wakeUp(pet);
    return { success: true };
  }

  /**
   * Toggle nightlight for timid pets.
   */
  toggleNightlight(pet: PetState): boolean {
    pet.sleep.nightlightOn = !pet.sleep.nightlightOn;
    return pet.sleep.nightlightOn;
  }

  /**
   * Check if the pet is timid (benefits from nightlight).
   */
  isTimid(pet: PetState): boolean {
    return pet.hiddenStats.personality[0] < TIMID_THRESHOLD;
  }

  /**
   * Get the stat decay multiplier based on sleep state.
   * Returns a reduced multiplier when sleeping.
   */
  getDecayMultiplier(pet: PetState): number {
    return this.isSleeping(pet) ? SLEEP_DECAY_MULTIPLIER : 1.0;
  }

  /**
   * Get current sleep phase.
   */
  getPhase(pet: PetState): SleepPhase {
    return pet.sleep.phase;
  }

  /**
   * Get the current dream mood (null if not dreaming).
   */
  getDreamMood(pet: PetState): string | null {
    return pet.sleep.dreamMood;
  }

  /**
   * Check if it's naturally sleep time based on current hour.
   */
  isNightTime(now: number): boolean {
    const hour = new Date(now).getHours();
    return hour >= DROWSY_START_HOUR || hour < WAKE_HOUR;
  }

  private tickSleeping(pet: PetState, dt: number, now: number): void {
    const sleep = pet.sleep;
    const elapsedSleep = (now - sleep.sleepStartTimestamp) / 1000;

    // Phase progression based on elapsed time
    this.updateSleepPhase(pet, elapsedSleep);

    // Energy recovery
    const isDeep = sleep.phase === 'deep' || sleep.phase === 'dream';
    const recoveryRate = isDeep
      ? DEEP_SLEEP_ENERGY_RECOVERY
      : SLEEP_ENERGY_RECOVERY;

    pet.stats.energy = clamp(pet.stats.energy + recoveryRate * dt, 0, 100);

    // Happiness recovery during sleep
    pet.stats.happiness = clamp(
      pet.stats.happiness + SLEEP_HAPPINESS_RECOVERY * dt,
      0,
      100,
    );

    // Stress reduction during sleep
    let stressReduction = SLEEP_STRESS_REDUCTION;

    // Nightlight bonus for timid pets
    if (sleep.nightlightOn && this.isTimid(pet)) {
      stressReduction += NIGHTLIGHT_STRESS_BONUS;
    }

    pet.hiddenStats.stress = clamp(
      pet.hiddenStats.stress - stressReduction * dt,
      0,
      100,
    );

    // Natural wake check
    const hour = new Date(now).getHours();
    if (
      hour >= WAKE_HOUR &&
      hour < DROWSY_START_HOUR &&
      elapsedSleep >= MIN_SLEEP_DURATION
    ) {
      this.wakeUp(pet);
    }
  }

  private tickAwake(pet: PetState, hour: number): void {
    // Check for natural drowsiness at night
    if (hour >= DROWSY_START_HOUR || hour < WAKE_HOUR) {
      // Pet gets drowsy naturally if energy is low enough
      if (pet.stats.energy < 40) {
        pet.sleep.phase = 'drowsy';
        pet.sleep.sleepStartTimestamp = Date.now();
        pet.sleep.wasForced = false;
        pet.sleep.dreamMood = null;
      }
    }
  }

  private updateSleepPhase(pet: PetState, elapsedSleep: number): void {
    const sleep = pet.sleep;
    const drowsyEnd = PHASE_DURATIONS.drowsy;
    const lightEnd = drowsyEnd + PHASE_DURATIONS.light;
    const deepEnd = lightEnd + PHASE_DURATIONS.deep;

    if (elapsedSleep < drowsyEnd) {
      sleep.phase = 'drowsy';
    } else if (elapsedSleep < lightEnd) {
      sleep.phase = 'light';
    } else if (elapsedSleep < deepEnd) {
      sleep.phase = 'deep';
    } else {
      // Dream phase — cycles between deep and dream
      const cycleTime = PHASE_DURATIONS.deep + PHASE_DURATIONS.dream;
      const cyclePos = (elapsedSleep - lightEnd) % cycleTime;
      if (cyclePos < PHASE_DURATIONS.deep) {
        sleep.phase = 'deep';
        sleep.dreamMood = null;
      } else {
        if (sleep.phase !== 'dream') {
          sleep.dreamMood = getDreamMood(pet.stats);
        }
        sleep.phase = 'dream';
      }
    }
  }

  private wakeUp(pet: PetState): void {
    pet.sleep.phase = 'awake';
    pet.sleep.sleepStartTimestamp = 0;
    pet.sleep.dreamMood = null;
    pet.sleep.wasForced = false;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
