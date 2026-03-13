import { describe, it, expect } from 'vitest';
import {
  LifeStage,
  LIFE_STAGE_ORDER,
  LIFE_STAGE_CONFIGS,
  getNextStage,
  isInteractionAvailable,
} from '@data/LifeStages';

describe('LifeStages', () => {
  describe('LIFE_STAGE_ORDER', () => {
    it('contains all 6 stages in correct order', () => {
      expect(LIFE_STAGE_ORDER).toEqual([
        LifeStage.Egg,
        LifeStage.Blob,
        LifeStage.Juvenile,
        LifeStage.Adolescent,
        LifeStage.Adult,
        LifeStage.Elder,
      ]);
    });
  });

  describe('LIFE_STAGE_CONFIGS', () => {
    it('has config for every stage', () => {
      for (const stage of LIFE_STAGE_ORDER) {
        expect(LIFE_STAGE_CONFIGS[stage]).toBeDefined();
        expect(LIFE_STAGE_CONFIGS[stage].stage).toBe(stage);
      }
    });

    it('egg has zero decay rates', () => {
      const egg = LIFE_STAGE_CONFIGS[LifeStage.Egg];
      for (const val of Object.values(egg.decayRates)) {
        expect(val).toBe(0);
      }
    });

    it('elder has null duration (final stage)', () => {
      expect(LIFE_STAGE_CONFIGS[LifeStage.Elder].duration).toBeNull();
    });

    it('non-elder stages have positive durations', () => {
      for (const stage of LIFE_STAGE_ORDER) {
        if (stage === LifeStage.Elder) continue;
        expect(LIFE_STAGE_CONFIGS[stage].duration).toBeGreaterThan(0);
      }
    });

    it('later stages generally have more available interactions', () => {
      const egg = LIFE_STAGE_CONFIGS[LifeStage.Egg].availableInteractions.length;
      const adult = LIFE_STAGE_CONFIGS[LifeStage.Adult].availableInteractions.length;
      expect(adult).toBeGreaterThan(egg);
    });
  });

  describe('getNextStage', () => {
    it('returns blob after egg', () => {
      expect(getNextStage(LifeStage.Egg)).toBe(LifeStage.Blob);
    });

    it('returns null for elder (final stage)', () => {
      expect(getNextStage(LifeStage.Elder)).toBeNull();
    });

    it('progresses through all stages in order', () => {
      let current: LifeStage | null = LifeStage.Egg;
      const visited: LifeStage[] = [current];
      while (current !== null) {
        current = getNextStage(current);
        if (current) visited.push(current);
      }
      expect(visited).toEqual(LIFE_STAGE_ORDER);
    });
  });

  describe('isInteractionAvailable', () => {
    it('egg only allows tap, warm, talk', () => {
      expect(isInteractionAvailable(LifeStage.Egg, 'tap')).toBe(true);
      expect(isInteractionAvailable(LifeStage.Egg, 'warm')).toBe(true);
      expect(isInteractionAvailable(LifeStage.Egg, 'talk')).toBe(true);
      expect(isInteractionAvailable(LifeStage.Egg, 'feed')).toBe(false);
    });

    it('explore unlocks at adolescent', () => {
      expect(isInteractionAvailable(LifeStage.Juvenile, 'explore')).toBe(false);
      expect(isInteractionAvailable(LifeStage.Adolescent, 'explore')).toBe(true);
    });

    it('legacy unlocks at elder', () => {
      expect(isInteractionAvailable(LifeStage.Adult, 'legacy')).toBe(false);
      expect(isInteractionAvailable(LifeStage.Elder, 'legacy')).toBe(true);
    });
  });
});
