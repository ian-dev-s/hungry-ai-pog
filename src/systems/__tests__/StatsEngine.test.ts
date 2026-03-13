import { describe, it, expect, beforeEach } from 'vitest';
import { StatsEngine } from '../StatsEngine';
import {
  PetState,
  createDefaultTrainingState,
  createDefaultHygieneState,
  createDefaultSleepState,
} from '../../data/SaveSchema';
import {
  STAT_MAX,
  STAT_MIN,
  getDecayRate,
  getStatInteractions,
} from '../../data/StatsConfig';

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

describe('StatsEngine', () => {
  let engine: StatsEngine;

  beforeEach(() => {
    engine = new StatsEngine();
  });

  describe('tick', () => {
    it('decays stats over time based on decay rates', () => {
      const pet = createTestPet();
      const initialHunger = pet.stats.hunger;

      engine.tick(pet, 10); // 10 seconds

      expect(pet.stats.hunger).toBeLessThan(initialHunger);
    });

    it('does not decay stats below STAT_MIN', () => {
      const pet = createTestPet();
      pet.stats.hunger = 0.001;

      engine.tick(pet, 1);

      expect(pet.stats.hunger).toBeGreaterThanOrEqual(STAT_MIN);
    });

    it('does not decay egg stats', () => {
      const pet = createTestPet({ lifeStage: 'egg' });
      const before = { ...pet.stats };

      engine.tick(pet, 100);

      expect(pet.stats).toEqual(before);
    });

    it('applies different decay rates per life stage', () => {
      const blobPet = createTestPet({ lifeStage: 'blob' });
      const adultPet = createTestPet({ lifeStage: 'adult' });

      engine.tick(blobPet, 60);
      engine.tick(adultPet, 60);

      // Blob has higher hunger decay multiplier (1.3 vs 1.0)
      expect(blobPet.stats.hunger).toBeLessThan(adultPet.stats.hunger);
    });

    it('applies stat interactions when stats are low', () => {
      const pet = createTestPet();
      pet.stats.hunger = 10; // critically low
      const initialHealth = pet.stats.health;

      engine.tick(pet, 60);

      // Low hunger should drain health
      expect(pet.stats.health).toBeLessThan(initialHealth);
    });

    it('increases stress when happiness is critically low', () => {
      const pet = createTestPet();
      pet.stats.happiness = 10;
      const initialStress = pet.hiddenStats.stress;

      engine.tick(pet, 60);

      expect(pet.hiddenStats.stress).toBeGreaterThan(initialStress);
    });
  });

  describe('simulateOffline', () => {
    it('simulates decay over elapsed milliseconds', () => {
      const pet = createTestPet();
      const initialHunger = pet.stats.hunger;

      // Simulate 1 hour offline
      engine.simulateOffline(pet, 3600 * 1000);

      expect(pet.stats.hunger).toBeLessThan(initialHunger);
    });

    it('uses larger steps for long offline periods', () => {
      const pet1 = createTestPet();
      const pet2 = createTestPet();

      // Both should produce similar results regardless of step size
      engine.simulateOffline(pet1, 7200 * 1000); // 2 hours (large steps)

      // Manual small-step simulation for comparison
      const stepSize = 60;
      const steps = (7200 / stepSize);
      for (let i = 0; i < steps; i++) {
        engine.tick(pet2, stepSize);
      }

      // Should be approximately equal (interaction effects cause minor differences)
      expect(Math.abs(pet1.stats.hunger - pet2.stats.hunger)).toBeLessThan(1);
    });

    it('does not crash for very long offline periods', () => {
      const pet = createTestPet();

      // 72 hours
      engine.simulateOffline(pet, 72 * 3600 * 1000);

      expect(pet.stats.hunger).toBeGreaterThanOrEqual(STAT_MIN);
      expect(pet.stats.hunger).toBeLessThanOrEqual(STAT_MAX);
    });
  });

  describe('modifyStat', () => {
    it('increases a stat by positive delta', () => {
      const pet = createTestPet();
      pet.stats.hunger = 50;

      engine.modifyStat(pet, 'hunger', 20);

      expect(pet.stats.hunger).toBe(70);
    });

    it('decreases a stat by negative delta', () => {
      const pet = createTestPet();
      pet.stats.happiness = 50;

      engine.modifyStat(pet, 'happiness', -15);

      expect(pet.stats.happiness).toBe(35);
    });

    it('clamps to STAT_MAX', () => {
      const pet = createTestPet();
      pet.stats.hunger = 90;

      engine.modifyStat(pet, 'hunger', 50);

      expect(pet.stats.hunger).toBe(STAT_MAX);
    });

    it('clamps to STAT_MIN', () => {
      const pet = createTestPet();
      pet.stats.energy = 5;

      engine.modifyStat(pet, 'energy', -20);

      expect(pet.stats.energy).toBe(STAT_MIN);
    });
  });

  describe('modifyHiddenStat', () => {
    it('modifies hidden stat with clamping', () => {
      const pet = createTestPet();
      pet.hiddenStats.trust = 40;

      engine.modifyHiddenStat(pet, 'trust', 15);

      expect(pet.hiddenStats.trust).toBe(55);
    });

    it('clamps hidden stats to 0-100 range', () => {
      const pet = createTestPet();
      pet.hiddenStats.stress = 95;

      engine.modifyHiddenStat(pet, 'stress', 20);

      expect(pet.hiddenStats.stress).toBe(STAT_MAX);
    });
  });

  describe('setStat', () => {
    it('sets stat to exact value', () => {
      const pet = createTestPet();

      engine.setStat(pet, 'bond', 42);

      expect(pet.stats.bond).toBe(42);
    });

    it('clamps value to valid range', () => {
      const pet = createTestPet();

      engine.setStat(pet, 'bond', 150);

      expect(pet.stats.bond).toBe(STAT_MAX);
    });
  });

  describe('getStats', () => {
    it('returns a copy of all visible stats', () => {
      const pet = createTestPet();
      const stats = engine.getStats(pet);

      expect(stats).toEqual(pet.stats);

      // Verify it is a copy
      stats.hunger = 0;
      expect(pet.stats.hunger).toBe(80);
    });
  });

  describe('getCriticalStats', () => {
    it('returns stats below threshold', () => {
      const pet = createTestPet();
      pet.stats.hunger = 10;
      pet.stats.energy = 15;

      const critical = engine.getCriticalStats(pet);

      expect(critical).toContain('hunger');
      expect(critical).toContain('energy');
      expect(critical).not.toContain('happiness');
    });

    it('returns empty array when all stats healthy', () => {
      const pet = createTestPet();

      expect(engine.getCriticalStats(pet)).toEqual([]);
    });

    it('supports custom threshold', () => {
      const pet = createTestPet();
      pet.stats.hunger = 45;

      expect(engine.getCriticalStats(pet, 50)).toContain('hunger');
      expect(engine.getCriticalStats(pet, 40)).not.toContain('hunger');
    });
  });

  describe('getWellness', () => {
    it('returns average of all visible stats', () => {
      const pet = createTestPet();
      // All stats at 80
      expect(engine.getWellness(pet)).toBe(80);
    });

    it('reflects stat changes', () => {
      const pet = createTestPet();
      pet.stats.hunger = 0;
      pet.stats.happiness = 0;

      // 5 stats at 80, 2 at 0 → (5*80 + 0) / 7 ≈ 57.14
      expect(engine.getWellness(pet)).toBeCloseTo(400 / 7, 1);
    });
  });
});

describe('StatsConfig', () => {
  describe('getDecayRate', () => {
    it('returns 0 for egg stage', () => {
      expect(getDecayRate('hunger', 'egg')).toBe(0);
    });

    it('returns positive rate for adult hunger', () => {
      expect(getDecayRate('hunger', 'adult')).toBeGreaterThan(0);
    });

    it('health has zero base decay', () => {
      expect(getDecayRate('health', 'adult')).toBe(0);
    });
  });

  describe('getStatInteractions', () => {
    it('returns health drain when hunger is critically low', () => {
      const stats = {
        hunger: 10,
        happiness: 80,
        energy: 80,
        hygiene: 80,
        health: 80,
        bond: 80,
        discipline: 80,
      };

      const effects = getStatInteractions(stats);
      const healthEffects = effects.filter((e) => e.stat === 'health');

      expect(healthEffects.length).toBeGreaterThan(0);
      expect(healthEffects[0].rate).toBeGreaterThan(0);
    });

    it('returns no effects when all stats are healthy', () => {
      const stats = {
        hunger: 80,
        happiness: 80,
        energy: 80,
        hygiene: 80,
        health: 80,
        bond: 80,
        discipline: 80,
      };

      expect(getStatInteractions(stats)).toEqual([]);
    });

    it('returns stress increase when happiness is low', () => {
      const stats = {
        hunger: 80,
        happiness: 15,
        energy: 80,
        hygiene: 80,
        health: 80,
        bond: 80,
        discipline: 80,
      };

      const effects = getStatInteractions(stats);
      const stressEffects = effects.filter((e) => e.stat === 'stress');

      expect(stressEffects.length).toBeGreaterThan(0);
    });
  });
});
