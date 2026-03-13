import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LifeStageManager } from '@systems/LifeStageManager';
import { LifeStage, LIFE_STAGE_CONFIGS } from '@data/LifeStages';
import type { PetState } from '@data/SaveSchema';

function createTestPet(overrides: Partial<PetState> = {}): PetState {
  return {
    name: 'TestPet',
    elementType: 'forest',
    lifeStage: LifeStage.Blob,
    stats: {
      hunger: 100,
      happiness: 100,
      energy: 100,
      hygiene: 100,
      health: 100,
      bond: 100,
      discipline: 100,
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

describe('LifeStageManager', () => {
  let manager: LifeStageManager;

  beforeEach(() => {
    manager = new LifeStageManager();
  });

  describe('update - stat decay', () => {
    it('decays stats based on stage config rates', () => {
      const pet = createTestPet({ lifeStage: LifeStage.Blob });
      const config = LIFE_STAGE_CONFIGS[LifeStage.Blob];

      manager.update(pet, 10, Date.now()); // 10 seconds

      expect(pet.stats.hunger).toBeCloseTo(100 - config.decayRates.hunger * 10, 5);
      expect(pet.stats.happiness).toBeCloseTo(100 - config.decayRates.happiness * 10, 5);
    });

    it('does not decay stats below 0', () => {
      const pet = createTestPet({
        lifeStage: LifeStage.Adolescent,
        stats: {
          hunger: 0.001,
          happiness: 0.001,
          energy: 0.001,
          hygiene: 0.001,
          health: 0.001,
          bond: 0.001,
          discipline: 0.001,
        },
      });

      manager.update(pet, 100, Date.now());

      expect(pet.stats.hunger).toBe(0);
      expect(pet.stats.happiness).toBe(0);
    });

    it('egg stage has no decay', () => {
      const pet = createTestPet({ lifeStage: LifeStage.Egg });
      manager.update(pet, 1000, Date.now());

      expect(pet.stats.hunger).toBe(100);
      expect(pet.stats.happiness).toBe(100);
    });
  });

  describe('update - stage transitions', () => {
    it('advances stage when duration is exceeded', () => {
      const now = Date.now();
      const blobDuration = LIFE_STAGE_CONFIGS[LifeStage.Blob].duration!;
      const pet = createTestPet({
        lifeStage: LifeStage.Blob,
        stageStartTimestamp: now - blobDuration - 1000,
      });

      const transitioned = manager.update(pet, 1, now);

      expect(transitioned).toBe(true);
      expect(pet.lifeStage).toBe(LifeStage.Juvenile);
      expect(pet.stageStartTimestamp).toBe(now);
    });

    it('does not advance before duration is reached', () => {
      const now = Date.now();
      const pet = createTestPet({
        lifeStage: LifeStage.Blob,
        stageStartTimestamp: now - 1000, // just 1 second ago
      });

      const transitioned = manager.update(pet, 1, now);

      expect(transitioned).toBe(false);
      expect(pet.lifeStage).toBe(LifeStage.Blob);
    });

    it('elder stage never transitions', () => {
      const now = Date.now();
      const pet = createTestPet({
        lifeStage: LifeStage.Elder,
        stageStartTimestamp: now - 999_999_999,
      });

      const transitioned = manager.update(pet, 1, now);

      expect(transitioned).toBe(false);
      expect(pet.lifeStage).toBe(LifeStage.Elder);
    });

    it('fires stage change listeners on transition', () => {
      const listener = vi.fn();
      manager.onStageChange(listener);

      const now = Date.now();
      const blobDuration = LIFE_STAGE_CONFIGS[LifeStage.Blob].duration!;
      const pet = createTestPet({
        lifeStage: LifeStage.Blob,
        stageStartTimestamp: now - blobDuration - 1000,
      });

      manager.update(pet, 1, now);

      expect(listener).toHaveBeenCalledWith(
        LifeStage.Blob,
        LifeStage.Juvenile,
        pet,
      );
    });

    it('unsubscribe removes listener', () => {
      const listener = vi.fn();
      const unsub = manager.onStageChange(listener);
      unsub();

      const now = Date.now();
      const blobDuration = LIFE_STAGE_CONFIGS[LifeStage.Blob].duration!;
      const pet = createTestPet({
        lifeStage: LifeStage.Blob,
        stageStartTimestamp: now - blobDuration - 1000,
      });

      manager.update(pet, 1, now);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('canInteract', () => {
    it('returns true for available interactions', () => {
      const pet = createTestPet({ lifeStage: LifeStage.Blob });
      expect(manager.canInteract(pet, 'feed')).toBe(true);
    });

    it('returns false for unavailable interactions', () => {
      const pet = createTestPet({ lifeStage: LifeStage.Blob });
      expect(manager.canInteract(pet, 'explore')).toBe(false);
    });
  });

  describe('getStageProgress', () => {
    it('returns 0 at start of stage', () => {
      const now = Date.now();
      const pet = createTestPet({ stageStartTimestamp: now });
      expect(manager.getStageProgress(pet, now)).toBe(0);
    });

    it('returns 0.5 at halfway point', () => {
      const now = Date.now();
      const duration = LIFE_STAGE_CONFIGS[LifeStage.Blob].duration!;
      const pet = createTestPet({
        stageStartTimestamp: now - duration / 2,
      });
      expect(manager.getStageProgress(pet, now)).toBeCloseTo(0.5, 2);
    });

    it('returns 1 for elder stage', () => {
      const pet = createTestPet({ lifeStage: LifeStage.Elder });
      expect(manager.getStageProgress(pet, Date.now())).toBe(1);
    });

    it('caps at 1 when past duration', () => {
      const now = Date.now();
      const duration = LIFE_STAGE_CONFIGS[LifeStage.Blob].duration!;
      const pet = createTestPet({
        stageStartTimestamp: now - duration * 2,
      });
      expect(manager.getStageProgress(pet, now)).toBe(1);
    });
  });

  describe('getTimeRemaining', () => {
    it('returns full duration at start of stage', () => {
      const now = Date.now();
      const duration = LIFE_STAGE_CONFIGS[LifeStage.Blob].duration!;
      const pet = createTestPet({ stageStartTimestamp: now });
      expect(manager.getTimeRemaining(pet, now)).toBe(duration);
    });

    it('returns null for elder stage', () => {
      const pet = createTestPet({ lifeStage: LifeStage.Elder });
      expect(manager.getTimeRemaining(pet, Date.now())).toBeNull();
    });

    it('returns 0 when past duration', () => {
      const now = Date.now();
      const duration = LIFE_STAGE_CONFIGS[LifeStage.Blob].duration!;
      const pet = createTestPet({
        stageStartTimestamp: now - duration * 2,
      });
      expect(manager.getTimeRemaining(pet, now)).toBe(0);
    });
  });

  describe('forceAdvance', () => {
    it('advances to next stage', () => {
      const now = Date.now();
      const pet = createTestPet({ lifeStage: LifeStage.Egg });
      const result = manager.forceAdvance(pet, now);
      expect(result).toBe(true);
      expect(pet.lifeStage).toBe(LifeStage.Blob);
    });

    it('returns false at elder (cannot advance)', () => {
      const pet = createTestPet({ lifeStage: LifeStage.Elder });
      expect(manager.forceAdvance(pet, Date.now())).toBe(false);
    });
  });
});
