import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IllnessEngine } from '../IllnessEngine';
import { PetState } from '../../data/SaveSchema';
import { ILLNESS_DEFINITIONS } from '../../data/IllnessConfig';

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
    illness: {
      type: null,
      startTimestamp: null,
    },
    evolutionPath: null,
    birthTimestamp: Date.now(),
    stageStartTimestamp: Date.now(),
    ...overrides,
  };
}

describe('IllnessEngine', () => {
  let engine: IllnessEngine;

  beforeEach(() => {
    engine = new IllnessEngine();
  });

  describe('updateIllness', () => {
    it('does not contract illness when health is healthy', () => {
      const pet = createTestPet();
      pet.stats.health = 80;

      engine.updateIllness(pet, 1);

      expect(pet.illness.type).toBeNull();
    });

    it('has chance to contract illness when health is critical', () => {
      const pet = createTestPet();
      pet.stats.health = 10; // Below 20 threshold

      // Mock random to always trigger illness
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.1); // Below 0.15 threshold

      engine.updateIllness(pet, 1);

      expect(pet.illness.type).not.toBeNull();
      expect(pet.illness.startTimestamp).not.toBeNull();

      vi.restoreAllMocks();
    });

    it('does not always contract illness when health is critical', () => {
      const pet = createTestPet();
      pet.stats.health = 10;

      // Mock random to not trigger illness
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.9); // Above 0.15 threshold

      engine.updateIllness(pet, 1);

      expect(pet.illness.type).toBeNull();

      vi.restoreAllMocks();
    });

    it('does not contract new illness if already ill', () => {
      const pet = createTestPet();
      pet.stats.health = 10;
      pet.illness.type = 'cold';
      pet.illness.startTimestamp = Date.now();

      const originalType = pet.illness.type;

      engine.updateIllness(pet, 1);

      expect(pet.illness.type).toBe(originalType);
    });

    it('removes illness after duration expires', () => {
      const pet = createTestPet();
      const now = Date.now();
      const pastTime = now - (ILLNESS_DEFINITIONS['cold'].durationSeconds + 10) * 1000;

      pet.illness.type = 'cold';
      pet.illness.startTimestamp = pastTime;

      vi.useFakeTimers();
      vi.setSystemTime(now);

      engine.updateIllness(pet, 1);

      expect(pet.illness.type).toBeNull();
      expect(pet.illness.startTimestamp).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('applyIllnessEffects', () => {
    it('applies health drain when ill with cold', () => {
      const pet = createTestPet();
      pet.illness.type = 'cold';
      pet.illness.startTimestamp = Date.now();
      const initialHealth = pet.stats.health;

      engine.applyIllnessEffects(pet, 10);

      const coldDrain = ILLNESS_DEFINITIONS['cold'].healthDrainRate * 10;
      expect(pet.stats.health).toBeLessThan(initialHealth);
      expect(pet.stats.health).toBeCloseTo(initialHealth - coldDrain, 1);
    });

    it('applies happiness drain when ill', () => {
      const pet = createTestPet();
      pet.illness.type = 'cold';
      pet.illness.startTimestamp = Date.now();
      const initialHappiness = pet.stats.happiness;

      engine.applyIllnessEffects(pet, 10);

      const coldDrain = ILLNESS_DEFINITIONS['cold'].happinessDrainRate * 10;
      expect(pet.stats.happiness).toBeLessThan(initialHappiness);
      expect(pet.stats.happiness).toBeCloseTo(initialHappiness - coldDrain, 1);
    });

    it('applies different drain rates per illness type', () => {
      const petWithCold = createTestPet();
      petWithCold.illness.type = 'cold';
      petWithCold.illness.startTimestamp = Date.now();
      const coldHealth = petWithCold.stats.health;

      const petWithFlu = createTestPet();
      petWithFlu.illness.type = 'flu';
      petWithFlu.illness.startTimestamp = Date.now();
      const fluHealth = petWithFlu.stats.health;

      engine.applyIllnessEffects(petWithCold, 10);
      engine.applyIllnessEffects(petWithFlu, 10);

      // Flu should drain more health than cold
      expect(petWithFlu.stats.health).toBeLessThan(petWithCold.stats.health);
    });

    it('does not drain stats if not ill', () => {
      const pet = createTestPet();
      const initialHealth = pet.stats.health;
      const initialHappiness = pet.stats.happiness;

      engine.applyIllnessEffects(pet, 10);

      expect(pet.stats.health).toBe(initialHealth);
      expect(pet.stats.happiness).toBe(initialHappiness);
    });

    it('does not drain below 0', () => {
      const pet = createTestPet();
      pet.illness.type = 'poisoning'; // High drain rate
      pet.illness.startTimestamp = Date.now();
      pet.stats.health = 2;

      engine.applyIllnessEffects(pet, 100); // Very large dt

      expect(pet.stats.health).toBeGreaterThanOrEqual(0);
    });
  });

  describe('cureIllness', () => {
    it('removes current illness', () => {
      const pet = createTestPet();
      pet.illness.type = 'cold';
      pet.illness.startTimestamp = Date.now();

      engine.cureIllness(pet);

      expect(pet.illness.type).toBeNull();
      expect(pet.illness.startTimestamp).toBeNull();
    });

    it('does nothing if pet is not ill', () => {
      const pet = createTestPet();

      engine.cureIllness(pet);

      expect(pet.illness.type).toBeNull();
      expect(pet.illness.startTimestamp).toBeNull();
    });
  });

  describe('isIll', () => {
    it('returns true when pet has active illness', () => {
      const pet = createTestPet();
      pet.illness.type = 'cold';
      pet.illness.startTimestamp = Date.now();

      expect(engine.isIll(pet)).toBe(true);
    });

    it('returns false when pet is healthy', () => {
      const pet = createTestPet();

      expect(engine.isIll(pet)).toBe(false);
    });
  });

  describe('getCurrentIllness', () => {
    it('returns the current illness type', () => {
      const pet = createTestPet();
      pet.illness.type = 'flu';

      expect(engine.getCurrentIllness(pet)).toBe('flu');
    });

    it('returns null when healthy', () => {
      const pet = createTestPet();

      expect(engine.getCurrentIllness(pet)).toBeNull();
    });
  });

  describe('getIllnessInfo', () => {
    it('returns illness details when ill', () => {
      const pet = createTestPet();
      pet.illness.type = 'cold';
      pet.illness.startTimestamp = Date.now();

      const info = engine.getIllnessInfo(pet);

      expect(info).not.toBeNull();
      expect(info?.type).toBe('cold');
      expect(info?.name).toBe('Cold');
      expect(info?.description).toBeDefined();
      expect(info?.progress).toBeGreaterThanOrEqual(0);
      expect(info?.progress).toBeLessThanOrEqual(1);
    });

    it('returns null when healthy', () => {
      const pet = createTestPet();

      expect(engine.getIllnessInfo(pet)).toBeNull();
    });

    it('tracks illness progress accurately', () => {
      const pet = createTestPet();
      const durationSeconds = ILLNESS_DEFINITIONS['cold'].durationSeconds;
      const now = Date.now();
      const halfwayTime = now - (durationSeconds / 2) * 1000;

      pet.illness.type = 'cold';
      pet.illness.startTimestamp = halfwayTime;

      vi.useFakeTimers();
      vi.setSystemTime(now);

      const info = engine.getIllnessInfo(pet);

      expect(info?.progress).toBeCloseTo(0.5, 1);

      vi.useRealTimers();
    });
  });
});
