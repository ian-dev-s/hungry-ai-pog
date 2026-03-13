import { describe, it, expect, beforeEach } from 'vitest';
import { HygieneSystem } from '../HygieneSystem';
import {
  PetState,
  createDefaultTrainingState,
  createDefaultHygieneState,
  createDefaultSleepState,
} from '../../data/SaveSchema';
import {
  BATH_HYGIENE_RESTORE,
  BATH_DIRT_REDUCTION,
  HEAVY_DIRT_THRESHOLD,
  PROGRESS_PER_INTERACTION,
  PHASE_COMPLETION,
  GROOMING_HYGIENE_BONUS,
} from '../../data/HygieneConfig';

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

describe('HygieneSystem', () => {
  let system: HygieneSystem;
  const now = Date.now();

  beforeEach(() => {
    system = new HygieneSystem();
  });

  describe('tick', () => {
    it('accumulates dirt over time', () => {
      const pet = createTestPet();
      pet.hygieneCare.dirtLevel = 0;

      system.tick(pet, 100);

      expect(pet.hygieneCare.dirtLevel).toBeGreaterThan(0);
    });

    it('does not accumulate dirt above 100', () => {
      const pet = createTestPet();
      pet.hygieneCare.dirtLevel = 99.99;

      system.tick(pet, 100);

      expect(pet.hygieneCare.dirtLevel).toBeLessThanOrEqual(100);
    });

    it('drains hygiene faster when heavily dirty', () => {
      const pet = createTestPet();
      pet.hygieneCare.dirtLevel = HEAVY_DIRT_THRESHOLD + 5;
      const initialHygiene = pet.stats.hygiene;

      system.tick(pet, 60);

      expect(pet.stats.hygiene).toBeLessThan(initialHygiene);
    });

    it('does not accumulate dirt during active bath', () => {
      const pet = createTestPet();
      pet.hygieneCare.bathPhase = 'scrub';
      pet.hygieneCare.dirtLevel = 50;

      system.tick(pet, 100);

      expect(pet.hygieneCare.dirtLevel).toBe(50);
    });
  });

  describe('startBath', () => {
    it('starts a bath successfully', () => {
      const pet = createTestPet();
      const result = system.startBath(pet, 'warm');

      expect(result.started).toBe(true);
      expect(pet.hygieneCare.bathPhase).toBe('scrub');
      expect(pet.hygieneCare.bathProgress).toBe(0);
    });

    it('rejects starting bath when one is in progress', () => {
      const pet = createTestPet();
      pet.hygieneCare.bathPhase = 'rinse';

      const result = system.startBath(pet, 'warm');
      expect(result.started).toBe(false);
    });

    it('boosts happiness with preferred temperature', () => {
      const pet = createTestPet();
      // Default forest element, 0.5 boldness → prefers warm
      const initialHappiness = pet.stats.happiness;

      system.startBath(pet, 'warm');

      expect(pet.stats.happiness).toBeGreaterThan(initialHappiness);
    });

    it('reduces happiness with wrong temperature', () => {
      const pet = createTestPet();
      const initialHappiness = pet.stats.happiness;

      system.startBath(pet, 'cold');

      expect(pet.stats.happiness).toBeLessThan(initialHappiness);
    });

    it('fire element prefers hot water', () => {
      const pet = createTestPet({ elementType: 'fire' });
      const initialHappiness = pet.stats.happiness;

      system.startBath(pet, 'hot');

      expect(pet.stats.happiness).toBeGreaterThan(initialHappiness);
    });

    it('aquatic element prefers warm water', () => {
      const pet = createTestPet({ elementType: 'aquatic' });
      const initialHappiness = pet.stats.happiness;

      system.startBath(pet, 'warm');

      expect(pet.stats.happiness).toBeGreaterThan(initialHappiness);
    });
  });

  describe('interact (bath phases)', () => {
    it('advances progress on interaction', () => {
      const pet = createTestPet();
      system.startBath(pet, 'warm');

      system.interact(pet, now);

      expect(pet.hygieneCare.bathProgress).toBe(PROGRESS_PER_INTERACTION);
    });

    it('advances to rinse phase after completing scrub', () => {
      const pet = createTestPet();
      system.startBath(pet, 'warm');

      // Complete scrub phase
      const tapsNeeded = Math.ceil(PHASE_COMPLETION / PROGRESS_PER_INTERACTION);
      for (let i = 0; i < tapsNeeded; i++) {
        system.interact(pet, now);
      }

      expect(pet.hygieneCare.bathPhase).toBe('rinse');
    });

    it('completes full bath after all three phases', () => {
      const pet = createTestPet();
      pet.hygieneCare.dirtLevel = 90;
      pet.stats.hygiene = 30;
      system.startBath(pet, 'warm');

      const tapsPerPhase = Math.ceil(
        PHASE_COMPLETION / PROGRESS_PER_INTERACTION,
      );
      let result = null;

      // 3 phases: scrub, rinse, dry
      for (let phase = 0; phase < 3; phase++) {
        for (let tap = 0; tap < tapsPerPhase; tap++) {
          result = system.interact(pet, now);
        }
      }

      expect(result).not.toBeNull();
      expect(result!.completed).toBe(true);
      expect(result!.hygieneRestored).toBe(BATH_HYGIENE_RESTORE);
    });

    it('reduces dirt after completing bath', () => {
      const pet = createTestPet();
      pet.hygieneCare.dirtLevel = 90;
      system.startBath(pet, 'warm');

      const tapsPerPhase = Math.ceil(
        PHASE_COMPLETION / PROGRESS_PER_INTERACTION,
      );
      for (let i = 0; i < tapsPerPhase * 3; i++) {
        system.interact(pet, now);
      }

      expect(pet.hygieneCare.dirtLevel).toBe(90 - BATH_DIRT_REDUCTION);
    });

    it('returns null when no bath is active', () => {
      const pet = createTestPet();

      expect(system.interact(pet, now)).toBeNull();
    });
  });

  describe('grooming', () => {
    it('allows grooming for adult pets', () => {
      const pet = createTestPet();
      expect(system.canGroom(pet)).toBe(true);
    });

    it('rejects grooming for blob stage', () => {
      const pet = createTestPet({ lifeStage: 'blob' });
      expect(system.canGroom(pet)).toBe(false);
    });

    it('grooms pet successfully', () => {
      const pet = createTestPet();
      const initialHygiene = pet.stats.hygiene;

      const result = system.groom(pet);

      expect(result.success).toBe(true);
      expect(pet.stats.hygiene).toBe(initialHygiene + GROOMING_HYGIENE_BONUS);
      expect(pet.hygieneCare.groomed).toBe(true);
    });

    it('rejects second grooming in same day', () => {
      const pet = createTestPet();
      system.groom(pet);

      const result = system.groom(pet);

      expect(result.success).toBe(false);
      expect(result.reason).toContain('already been groomed');
    });

    it('boosts happiness and bond', () => {
      const pet = createTestPet();
      const initialHappiness = pet.stats.happiness;
      const initialBond = pet.stats.bond;

      system.groom(pet);

      expect(pet.stats.happiness).toBeGreaterThan(initialHappiness);
      expect(pet.stats.bond).toBeGreaterThan(initialBond);
    });

    it('resets grooming on new day', () => {
      const pet = createTestPet();
      system.groom(pet);

      system.resetDailyGrooming(pet);

      expect(pet.hygieneCare.groomed).toBe(false);
    });
  });

  describe('isVisiblyDirty', () => {
    it('returns false when clean', () => {
      const pet = createTestPet();
      pet.hygieneCare.dirtLevel = 10;

      expect(system.isVisiblyDirty(pet)).toBe(false);
    });

    it('returns true when dirty enough', () => {
      const pet = createTestPet();
      pet.hygieneCare.dirtLevel = 50;

      expect(system.isVisiblyDirty(pet)).toBe(true);
    });
  });
});
