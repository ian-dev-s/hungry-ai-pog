import { describe, it, expect, beforeEach } from 'vitest';
import { EvolutionSystem, shouldEvolve } from '@systems/EvolutionSystem';
import { LifeStage } from '@data/LifeStages';
import { getArchetypesForElement } from '@data/EvolutionArchetypes';
import type { PetState } from '@data/SaveSchema';

function createTestPet(overrides: Partial<PetState> = {}): PetState {
  return {
    name: 'TestPet',
    elementType: 'fire',
    lifeStage: LifeStage.Adolescent,
    stats: {
      hunger: 80,
      happiness: 80,
      energy: 70,
      hygiene: 75,
      health: 90,
      bond: 80,
      discipline: 60,
    },
    hiddenStats: {
      personality: [0.5, 0.5, 0.5, 0.5],
      trust: 50,
      stress: 0,
    },
    evolutionPath: null,
    birthTimestamp: Date.now(),
    stageStartTimestamp: Date.now(),
    careHistory: {
      happinessAvg: 50,
      disciplineRatio: 0.5,
      uniqueFoodsCount: 0,
      activitiesCompleted: 0,
      bondAvg: 50,
      secretFlags: {},
    },
    ...overrides,
  };
}

describe('EvolutionSystem', () => {
  let system: EvolutionSystem;

  beforeEach(() => {
    system = new EvolutionSystem();
  });

  describe('recordSnapshot', () => {
    it('updates care history averages from pet stats', () => {
      const pet = createTestPet({
        stats: {
          hunger: 80, happiness: 90, energy: 70, hygiene: 75,
          health: 90, bond: 95, discipline: 60,
        },
      });

      system.recordSnapshot(pet);
      system.recordSnapshot(pet);

      const history = system.getCareHistory();
      // Average of initial 50 + two 90 samples = (50+90+90)/3
      expect(history.happinessAvg).toBeGreaterThan(50);
      expect(history.bondAvg).toBeGreaterThan(50);
    });
  });

  describe('recordFeeding', () => {
    it('tracks unique food types', () => {
      system.recordFeeding('apple');
      system.recordFeeding('banana');
      system.recordFeeding('apple'); // duplicate

      expect(system.getCareHistory().uniqueFoodsCount).toBe(2);
    });
  });

  describe('recordDiscipline', () => {
    it('increases discipline ratio', () => {
      system.recordDiscipline();
      system.recordDiscipline();
      system.recordInteraction(); // non-discipline

      const history = system.getCareHistory();
      // 2 discipline out of 3 total
      expect(history.disciplineRatio).toBeCloseTo(2 / 3, 5);
    });
  });

  describe('recordActivity', () => {
    it('increments activity count', () => {
      system.recordActivity();
      system.recordActivity();
      system.recordActivity();

      expect(system.getCareHistory().activitiesCompleted).toBe(3);
    });
  });

  describe('setSecretFlag', () => {
    it('stores secret flags in care history', () => {
      system.setSecretFlag('perfect_balance');
      expect(system.getCareHistory().secretFlags).toEqual({
        perfect_balance: true,
      });
    });
  });

  describe('determineEvolution', () => {
    it('returns an archetype matching the element', () => {
      const result = system.determineEvolution('fire');
      expect(result.archetype.element).toBe('fire');
    });

    it('returns a non-secret archetype by default', () => {
      const result = system.determineEvolution('forest');
      expect(result.isSecret).toBe(false);
    });

    it('favors discipline-heavy archetype with high discipline ratio', () => {
      // Heavily bias toward discipline
      for (let i = 0; i < 100; i++) {
        system.recordDiscipline();
      }
      // High activity too
      for (let i = 0; i < 50; i++) {
        system.recordActivity();
      }
      // Low happiness - use a pet with low happiness
      const sadPet = createTestPet({
        stats: { ...createTestPet().stats, happiness: 10, bond: 10 },
      });
      for (let i = 0; i < 20; i++) {
        system.recordSnapshot(sadPet);
      }

      const result = system.determineEvolution('fire');
      // Should favor magma_golem (highest discipline weight for fire)
      expect(result.archetype.weights.discipline).toBeGreaterThanOrEqual(0.3);
    });

    it('favors happiness-heavy archetype with high happiness', () => {
      const happyPet = createTestPet({
        stats: { ...createTestPet().stats, happiness: 95, bond: 40 },
      });
      for (let i = 0; i < 30; i++) {
        system.recordSnapshot(happyPet);
        system.recordInteraction();
      }
      for (let i = 0; i < 30; i++) {
        system.recordActivity();
      }

      const result = system.determineEvolution('fire');
      expect(result.archetype.weights.happiness).toBeGreaterThanOrEqual(0.2);
    });

    it('returns secret archetype when care is perfectly balanced', () => {
      // Create balanced conditions
      const balancedPet = createTestPet({
        stats: { ...createTestPet().stats, happiness: 50, bond: 50 },
      });

      // Many balanced snapshots to average out initial
      for (let i = 0; i < 100; i++) {
        system.recordSnapshot(balancedPet);
      }

      // Balanced discipline ratio (~0.5)
      for (let i = 0; i < 50; i++) {
        system.recordDiscipline();
        system.recordInteraction();
      }

      // Moderate diet variety (target: 7-8 unique / 15 max = ~0.5)
      for (let i = 0; i < 8; i++) {
        system.recordFeeding(`food_${i}`);
      }

      // Moderate activities (target: 25 / 50 max = 0.5)
      for (let i = 0; i < 25; i++) {
        system.recordActivity();
      }

      const result = system.determineEvolution('cosmic');
      expect(result.isSecret).toBe(true);
      expect(result.archetype.secret).toBe(true);
    });

    it('has positive score', () => {
      const result = system.determineEvolution('aquatic');
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe('constructor with existing care history', () => {
    it('restores from saved care history', () => {
      const saved = {
        happinessAvg: 75,
        disciplineRatio: 0.3,
        uniqueFoodsCount: 8,
        activitiesCompleted: 20,
        bondAvg: 65,
        secretFlags: { tested: true },
      };

      const restored = new EvolutionSystem(saved);
      const history = restored.getCareHistory();

      expect(history.activitiesCompleted).toBe(20);
      expect(history.secretFlags).toEqual({ tested: true });
    });
  });

  describe('shouldEvolve', () => {
    it('returns true when transitioning to Adult', () => {
      const pet = createTestPet();
      expect(shouldEvolve(pet, LifeStage.Adult)).toBe(true);
    });

    it('returns false for other stage transitions', () => {
      const pet = createTestPet();
      expect(shouldEvolve(pet, LifeStage.Juvenile)).toBe(false);
      expect(shouldEvolve(pet, LifeStage.Elder)).toBe(false);
    });
  });

  describe('element coverage', () => {
    it('returns valid archetypes for all element types', () => {
      for (const element of ['forest', 'aquatic', 'fire', 'cosmic'] as const) {
        const result = system.determineEvolution(element);
        expect(result.archetype).toBeDefined();
        expect(result.archetype.element).toBe(element);
      }
    });

    it('each element has at least 5 non-secret archetypes', () => {
      for (const element of ['forest', 'aquatic', 'fire', 'cosmic'] as const) {
        const nonSecret = getArchetypesForElement(element).filter((a) => !a.secret);
        expect(nonSecret.length).toBeGreaterThanOrEqual(5);
      }
    });
  });
});
