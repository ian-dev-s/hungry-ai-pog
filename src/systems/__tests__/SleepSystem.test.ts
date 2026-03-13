import { describe, it, expect, beforeEach } from 'vitest';
import { SleepSystem } from '../SleepSystem';
import {
  PetState,
  createDefaultTrainingState,
  createDefaultHygieneState,
  createDefaultSleepState,
} from '../../data/SaveSchema';
import {
  FORCE_WAKE_STRESS,
  SLEEP_DECAY_MULTIPLIER,
  PHASE_DURATIONS,
} from '../../data/SleepConfig';

function createTestPet(overrides?: Partial<PetState>): PetState {
  return {
    name: 'TestPet',
    elementType: 'forest',
    lifeStage: 'adult',
    stats: {
      hunger: 80,
      happiness: 80,
      energy: 80,
      hygiene: 80,
      health: 80,
      bond: 80,
      discipline: 80,
    },
    hiddenStats: {
      personality: [0.5, 0.5, 0.5, 0.5],
      trust: 50,
      stress: 10,
    },
    evolutionPath: null,
    birthTimestamp: Date.now(),
    stageStartTimestamp: Date.now(),
    training: createDefaultTrainingState(),
    hygieneCare: createDefaultHygieneState(),
    sleep: createDefaultSleepState(),
    ...overrides,
  };
}

/** Create a timestamp at a specific hour today. */
function timeAtHour(hour: number): number {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

describe('SleepSystem', () => {
  let system: SleepSystem;

  beforeEach(() => {
    system = new SleepSystem();
  });

  describe('putToBed', () => {
    it('puts pet to sleep successfully', () => {
      const pet = createTestPet();
      const now = Date.now();

      const result = system.putToBed(pet, now);

      expect(result.success).toBe(true);
      expect(pet.sleep.phase).toBe('drowsy');
      expect(pet.sleep.sleepStartTimestamp).toBe(now);
      expect(pet.sleep.wasForced).toBe(true);
    });

    it('rejects when already sleeping', () => {
      const pet = createTestPet();
      pet.sleep.phase = 'light';

      const result = system.putToBed(pet, Date.now());

      expect(result.success).toBe(false);
      expect(result.reason).toContain('already sleeping');
    });
  });

  describe('forceWake', () => {
    it('wakes pet up with stress penalty', () => {
      const pet = createTestPet();
      pet.sleep.phase = 'deep';
      const initialStress = pet.hiddenStats.stress;
      const initialHappiness = pet.stats.happiness;

      const result = system.forceWake(pet);

      expect(result.success).toBe(true);
      expect(pet.sleep.phase).toBe('awake');
      expect(pet.hiddenStats.stress).toBe(initialStress + FORCE_WAKE_STRESS);
      expect(pet.stats.happiness).toBeLessThan(initialHappiness);
    });

    it('reduces bond when forcing awake', () => {
      const pet = createTestPet();
      pet.sleep.phase = 'deep';
      const initialBond = pet.stats.bond;

      system.forceWake(pet);

      expect(pet.stats.bond).toBeLessThan(initialBond);
    });

    it('rejects when already awake', () => {
      const pet = createTestPet();

      const result = system.forceWake(pet);

      expect(result.success).toBe(false);
    });

    it('clears sleep state on wake', () => {
      const pet = createTestPet();
      pet.sleep.phase = 'dream';
      pet.sleep.dreamMood = 'heart';
      pet.sleep.sleepStartTimestamp = Date.now() - 10000;

      system.forceWake(pet);

      expect(pet.sleep.sleepStartTimestamp).toBe(0);
      expect(pet.sleep.dreamMood).toBeNull();
      expect(pet.sleep.wasForced).toBe(false);
    });
  });

  describe('tick (sleeping)', () => {
    it('recovers energy during sleep', () => {
      const pet = createTestPet();
      pet.stats.energy = 30;
      const now = Date.now();
      pet.sleep.phase = 'light';
      pet.sleep.sleepStartTimestamp = now - 400 * 1000; // 400s into sleep

      system.tick(pet, 60, now);

      expect(pet.stats.energy).toBeGreaterThan(30);
    });

    it('recovers happiness during sleep', () => {
      const pet = createTestPet();
      pet.stats.happiness = 50;
      const now = Date.now();
      pet.sleep.phase = 'light';
      pet.sleep.sleepStartTimestamp = now - 400 * 1000;

      system.tick(pet, 60, now);

      expect(pet.stats.happiness).toBeGreaterThan(50);
    });

    it('reduces stress during sleep', () => {
      const pet = createTestPet();
      pet.hiddenStats.stress = 50;
      const now = Date.now();
      pet.sleep.phase = 'light';
      pet.sleep.sleepStartTimestamp = now - 400 * 1000;

      system.tick(pet, 60, now);

      expect(pet.hiddenStats.stress).toBeLessThan(50);
    });

    it('progresses through sleep phases over time', () => {
      const pet = createTestPet();
      const now = Date.now();
      pet.sleep.phase = 'drowsy';

      // Set start time so elapsed puts us into light sleep
      const lightSleepTime = PHASE_DURATIONS.drowsy + 10;
      pet.sleep.sleepStartTimestamp = now - lightSleepTime * 1000;

      system.tick(pet, 1, now);

      expect(pet.sleep.phase).toBe('light');
    });

    it('enters deep sleep after enough time', () => {
      const pet = createTestPet();
      const now = Date.now();
      pet.sleep.phase = 'drowsy';

      const deepSleepTime =
        PHASE_DURATIONS.drowsy + PHASE_DURATIONS.light + 10;
      pet.sleep.sleepStartTimestamp = now - deepSleepTime * 1000;

      system.tick(pet, 1, now);

      expect(pet.sleep.phase).toBe('deep');
    });

    it('enters dream phase after deep sleep', () => {
      const pet = createTestPet();
      // Use a nighttime timestamp so natural wake doesn't trigger
      const now = timeAtHour(23);
      pet.sleep.phase = 'deep';

      const dreamTime =
        PHASE_DURATIONS.drowsy +
        PHASE_DURATIONS.light +
        PHASE_DURATIONS.deep +
        10;
      pet.sleep.sleepStartTimestamp = now - dreamTime * 1000;

      system.tick(pet, 1, now);

      expect(pet.sleep.phase).toBe('dream');
      expect(pet.sleep.dreamMood).not.toBeNull();
    });
  });

  describe('nightlight', () => {
    it('toggles nightlight on and off', () => {
      const pet = createTestPet();

      expect(system.toggleNightlight(pet)).toBe(true);
      expect(pet.sleep.nightlightOn).toBe(true);

      expect(system.toggleNightlight(pet)).toBe(false);
      expect(pet.sleep.nightlightOn).toBe(false);
    });

    it('identifies timid pets', () => {
      const timidPet = createTestPet();
      timidPet.hiddenStats.personality = [0.2, 0.5, 0.5, 0.5];

      expect(system.isTimid(timidPet)).toBe(true);
    });

    it('identifies non-timid pets', () => {
      const bravePet = createTestPet();
      bravePet.hiddenStats.personality = [0.7, 0.5, 0.5, 0.5];

      expect(system.isTimid(bravePet)).toBe(false);
    });

    it('gives extra stress reduction for timid pets with nightlight', () => {
      const pet = createTestPet();
      pet.hiddenStats.personality = [0.2, 0.5, 0.5, 0.5]; // timid
      pet.sleep.nightlightOn = true;
      pet.sleep.phase = 'light';
      pet.sleep.sleepStartTimestamp = Date.now() - 400 * 1000;
      pet.hiddenStats.stress = 50;
      const now = Date.now();

      const petNoLight = createTestPet();
      petNoLight.hiddenStats.personality = [0.2, 0.5, 0.5, 0.5];
      petNoLight.sleep.nightlightOn = false;
      petNoLight.sleep.phase = 'light';
      petNoLight.sleep.sleepStartTimestamp = now - 400 * 1000;
      petNoLight.hiddenStats.stress = 50;

      system.tick(pet, 60, now);
      system.tick(petNoLight, 60, now);

      expect(pet.hiddenStats.stress).toBeLessThan(
        petNoLight.hiddenStats.stress,
      );
    });
  });

  describe('getDecayMultiplier', () => {
    it('returns 1.0 when awake', () => {
      const pet = createTestPet();
      expect(system.getDecayMultiplier(pet)).toBe(1.0);
    });

    it('returns reduced multiplier when sleeping', () => {
      const pet = createTestPet();
      pet.sleep.phase = 'deep';

      expect(system.getDecayMultiplier(pet)).toBe(SLEEP_DECAY_MULTIPLIER);
    });
  });

  describe('isSleeping', () => {
    it('returns false when awake', () => {
      const pet = createTestPet();
      expect(system.isSleeping(pet)).toBe(false);
    });

    it('returns true for any sleep phase', () => {
      const pet = createTestPet();
      const phases = ['drowsy', 'light', 'deep', 'dream'] as const;

      for (const phase of phases) {
        pet.sleep.phase = phase;
        expect(system.isSleeping(pet)).toBe(true);
      }
    });
  });

  describe('isNightTime', () => {
    it('returns true at 22:00', () => {
      expect(system.isNightTime(timeAtHour(22))).toBe(true);
    });

    it('returns true at 3:00 AM', () => {
      expect(system.isNightTime(timeAtHour(3))).toBe(true);
    });

    it('returns false at noon', () => {
      expect(system.isNightTime(timeAtHour(12))).toBe(false);
    });

    it('returns false at 8 AM', () => {
      expect(system.isNightTime(timeAtHour(8))).toBe(false);
    });
  });
});
