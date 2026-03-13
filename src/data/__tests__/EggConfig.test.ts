import { describe, it, expect } from 'vitest';
import {
  EGG_TYPES,
  EGG_INTERACTION_EFFECTS,
  EGG_VISUAL_STAGES,
  ALL_EGG_ELEMENTS,
  DEFAULT_HATCH_THRESHOLDS,
  createDefaultEggState,
  getEggVisualStage,
  type EggElement,
} from '../EggConfig';

describe('EggConfig', () => {
  describe('EGG_TYPES', () => {
    it('defines all 6 elemental categories', () => {
      expect(Object.keys(EGG_TYPES)).toHaveLength(6);
      for (const element of ALL_EGG_ELEMENTS) {
        expect(EGG_TYPES[element]).toBeDefined();
      }
    });

    it('each type has required fields', () => {
      for (const element of ALL_EGG_ELEMENTS) {
        const config = EGG_TYPES[element];
        expect(config.id).toMatch(/^egg_/);
        expect(config.element).toBe(element);
        expect(config.name).toBeTruthy();
        expect(config.description).toBeTruthy();
        expect(config.baseColor).toMatch(/^#/);
        expect(config.accentColor).toMatch(/^#/);
        expect(config.interactionMultipliers.tap).toBeGreaterThan(0);
        expect(config.interactionMultipliers.warm).toBeGreaterThan(0);
        expect(config.interactionMultipliers.talk).toBeGreaterThan(0);
      }
    });
  });

  describe('ALL_EGG_ELEMENTS', () => {
    it('contains forest, aquatic, fire, cosmic, shadow, crystal', () => {
      expect(ALL_EGG_ELEMENTS).toEqual([
        'forest',
        'aquatic',
        'fire',
        'cosmic',
        'shadow',
        'crystal',
      ]);
    });
  });

  describe('EGG_INTERACTION_EFFECTS', () => {
    it('defines effects for tap, warm, and talk', () => {
      expect(EGG_INTERACTION_EFFECTS.tap).toBeDefined();
      expect(EGG_INTERACTION_EFFECTS.warm).toBeDefined();
      expect(EGG_INTERACTION_EFFECTS.talk).toBeDefined();
    });

    it('each effect has positive progress points', () => {
      for (const type of ['tap', 'warm', 'talk'] as const) {
        expect(EGG_INTERACTION_EFFECTS[type].progressPoints).toBeGreaterThan(0);
      }
    });

    it('each effect has personality influence array of length 4', () => {
      for (const type of ['tap', 'warm', 'talk'] as const) {
        expect(EGG_INTERACTION_EFFECTS[type].personalityInfluence).toHaveLength(4);
      }
    });

    it('each effect has positive cooldown', () => {
      for (const type of ['tap', 'warm', 'talk'] as const) {
        expect(EGG_INTERACTION_EFFECTS[type].cooldownMs).toBeGreaterThan(0);
      }
    });
  });

  describe('DEFAULT_HATCH_THRESHOLDS', () => {
    it('has minimum wall clock of 30 minutes', () => {
      expect(DEFAULT_HATCH_THRESHOLDS.minWallClockMs).toBe(30 * 60_000);
    });

    it('has maximum wall clock of 2 hours', () => {
      expect(DEFAULT_HATCH_THRESHOLDS.maxWallClockMs).toBe(2 * 3_600_000);
    });

    it('has positive interaction progress threshold', () => {
      expect(DEFAULT_HATCH_THRESHOLDS.minInteractionProgress).toBeGreaterThan(0);
    });

    it('max wall clock is greater than min', () => {
      expect(DEFAULT_HATCH_THRESHOLDS.maxWallClockMs).toBeGreaterThan(
        DEFAULT_HATCH_THRESHOLDS.minWallClockMs,
      );
    });
  });

  describe('createDefaultEggState', () => {
    it('creates state with correct element and timestamp', () => {
      const state = createDefaultEggState('aquatic', 12345);
      expect(state.element).toBe('aquatic');
      expect(state.obtainedTimestamp).toBe(12345);
    });

    it('starts with zero progress and interactions', () => {
      const state = createDefaultEggState('fire', 0);
      expect(state.interactionProgress).toBe(0);
      expect(state.totalInteractions).toBe(0);
      expect(state.hatched).toBe(false);
    });

    it('starts with neutral personality (0.5 on all axes)', () => {
      const state = createDefaultEggState('cosmic', 0);
      expect(state.personalityAccumulator).toEqual([0.5, 0.5, 0.5, 0.5]);
    });

    it('starts with baseline stat accumulators', () => {
      const state = createDefaultEggState('shadow', 0);
      expect(state.statAccumulator.trust).toBe(50);
      expect(state.statAccumulator.bond).toBe(50);
    });

    it('starts with zero interaction timestamps', () => {
      const state = createDefaultEggState('crystal', 0);
      expect(state.lastInteractionTimestamps.tap).toBe(0);
      expect(state.lastInteractionTimestamps.warm).toBe(0);
      expect(state.lastInteractionTimestamps.talk).toBe(0);
    });
  });

  describe('EGG_VISUAL_STAGES', () => {
    it('has 5 visual stages', () => {
      expect(EGG_VISUAL_STAGES).toHaveLength(5);
    });

    it('stages are in ascending progress order', () => {
      for (let i = 1; i < EGG_VISUAL_STAGES.length; i++) {
        expect(EGG_VISUAL_STAGES[i].minProgress).toBeGreaterThan(
          EGG_VISUAL_STAGES[i - 1].minProgress,
        );
      }
    });

    it('first stage starts at 0', () => {
      expect(EGG_VISUAL_STAGES[0].minProgress).toBe(0);
    });

    it('crack count increases through stages', () => {
      const cracks = EGG_VISUAL_STAGES.map((s) => s.cracks);
      for (let i = 1; i < cracks.length; i++) {
        expect(cracks[i]).toBeGreaterThanOrEqual(cracks[i - 1]);
      }
    });
  });

  describe('getEggVisualStage', () => {
    it('returns dormant at 0 progress', () => {
      expect(getEggVisualStage(0).label).toBe('dormant');
    });

    it('returns stirring at 0.25', () => {
      expect(getEggVisualStage(0.25).label).toBe('stirring');
    });

    it('returns glowing at 0.5', () => {
      expect(getEggVisualStage(0.5).label).toBe('glowing');
    });

    it('returns cracking at 0.75', () => {
      expect(getEggVisualStage(0.75).label).toBe('cracking');
    });

    it('returns hatching at 0.95', () => {
      expect(getEggVisualStage(0.95).label).toBe('hatching');
    });

    it('returns hatching at 1.0', () => {
      expect(getEggVisualStage(1.0).label).toBe('hatching');
    });

    it('returns dormant for values just below 0.25', () => {
      expect(getEggVisualStage(0.24).label).toBe('dormant');
    });
  });
});
