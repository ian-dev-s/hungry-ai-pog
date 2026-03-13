import { describe, it, expect } from 'vitest';
import {
  EGG_TYPES,
  EGG_INTERACTION_EFFECTS,
  EGG_VISUAL_STAGES,
  DEFAULT_HATCH_THRESHOLDS,
  ALL_EGG_ELEMENTS,
  createDefaultEggState,
  getEggVisualStage,
  type EggElement,
  type EggInteractionType,
} from '../EggConfig';

describe('EggConfig', () => {
  describe('EGG_TYPES', () => {
    it('defines all six elemental categories', () => {
      expect(ALL_EGG_ELEMENTS).toHaveLength(6);
      const expected: EggElement[] = ['forest', 'aquatic', 'fire', 'cosmic', 'shadow', 'crystal'];
      expect(ALL_EGG_ELEMENTS).toEqual(expected);
    });

    it('each egg type has required fields', () => {
      for (const element of ALL_EGG_ELEMENTS) {
        const config = EGG_TYPES[element];
        expect(config.id).toBeTruthy();
        expect(config.element).toBe(element);
        expect(config.name).toBeTruthy();
        expect(config.description).toBeTruthy();
        expect(config.baseColor).toMatch(/^#/);
        expect(config.accentColor).toMatch(/^#/);
        expect(config.interactionMultipliers).toBeDefined();
      }
    });

    it('each egg type has multipliers for all interaction types', () => {
      const interactionTypes: EggInteractionType[] = ['tap', 'warm', 'talk'];
      for (const element of ALL_EGG_ELEMENTS) {
        for (const type of interactionTypes) {
          const mult = EGG_TYPES[element].interactionMultipliers[type];
          expect(mult).toBeGreaterThan(0);
          expect(mult).toBeLessThanOrEqual(2);
        }
      }
    });

    it('each egg type has a unique id', () => {
      const ids = ALL_EGG_ELEMENTS.map((el) => EGG_TYPES[el].id);
      expect(new Set(ids).size).toBe(ids.length);
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

    it('warm has highest progress points (nurturing reward)', () => {
      expect(EGG_INTERACTION_EFFECTS.warm.progressPoints).toBeGreaterThan(
        EGG_INTERACTION_EFFECTS.tap.progressPoints,
      );
    });
  });

  describe('DEFAULT_HATCH_THRESHOLDS', () => {
    it('requires 100 interaction progress', () => {
      expect(DEFAULT_HATCH_THRESHOLDS.minInteractionProgress).toBe(100);
    });

    it('minimum wall clock time is 30 minutes', () => {
      expect(DEFAULT_HATCH_THRESHOLDS.minWallClockMs).toBe(30 * 60_000);
    });

    it('maximum wall clock time is 2 hours', () => {
      expect(DEFAULT_HATCH_THRESHOLDS.maxWallClockMs).toBe(2 * 3_600_000);
    });

    it('max time exceeds min time', () => {
      expect(DEFAULT_HATCH_THRESHOLDS.maxWallClockMs).toBeGreaterThan(
        DEFAULT_HATCH_THRESHOLDS.minWallClockMs,
      );
    });
  });

  describe('EGG_VISUAL_STAGES', () => {
    it('has 5 visual stages', () => {
      expect(EGG_VISUAL_STAGES).toHaveLength(5);
    });

    it('stages are ordered by minProgress', () => {
      for (let i = 1; i < EGG_VISUAL_STAGES.length; i++) {
        expect(EGG_VISUAL_STAGES[i].minProgress).toBeGreaterThan(
          EGG_VISUAL_STAGES[i - 1].minProgress,
        );
      }
    });

    it('first stage starts at 0 progress', () => {
      expect(EGG_VISUAL_STAGES[0].minProgress).toBe(0);
    });

    it('cracks increase with stage progression', () => {
      let maxCracks = 0;
      for (const stage of EGG_VISUAL_STAGES) {
        expect(stage.cracks).toBeGreaterThanOrEqual(maxCracks);
        maxCracks = stage.cracks;
      }
    });

    it('last stage has wobble, glow, and 3 cracks', () => {
      const last = EGG_VISUAL_STAGES[EGG_VISUAL_STAGES.length - 1];
      expect(last.wobble).toBe(true);
      expect(last.glow).toBe(true);
      expect(last.cracks).toBe(3);
    });
  });

  describe('getEggVisualStage', () => {
    it('returns dormant at 0 progress', () => {
      expect(getEggVisualStage(0).label).toBe('dormant');
    });

    it('returns hatching at 0.95+ progress', () => {
      expect(getEggVisualStage(0.95).label).toBe('hatching');
      expect(getEggVisualStage(1.0).label).toBe('hatching');
    });

    it('returns stirring at 0.25 progress', () => {
      expect(getEggVisualStage(0.25).label).toBe('stirring');
    });

    it('returns glowing at 0.5 progress', () => {
      expect(getEggVisualStage(0.5).label).toBe('glowing');
    });

    it('returns cracking at 0.75 progress', () => {
      expect(getEggVisualStage(0.75).label).toBe('cracking');
    });
  });

  describe('createDefaultEggState', () => {
    it('creates state with specified element', () => {
      const state = createDefaultEggState('fire', 12345);
      expect(state.element).toBe('fire');
      expect(state.obtainedTimestamp).toBe(12345);
    });

    it('starts with zero progress and interactions', () => {
      const state = createDefaultEggState('forest', 0);
      expect(state.interactionProgress).toBe(0);
      expect(state.totalInteractions).toBe(0);
      expect(state.hatched).toBe(false);
    });

    it('initializes personality at midpoints', () => {
      const state = createDefaultEggState('aquatic', 0);
      expect(state.personalityAccumulator).toEqual([0.5, 0.5, 0.5, 0.5]);
    });

    it('initializes stat accumulator at defaults', () => {
      const state = createDefaultEggState('cosmic', 0);
      expect(state.statAccumulator).toEqual({ trust: 50, bond: 50 });
    });

    it('initializes all interaction timestamps to 0', () => {
      const state = createDefaultEggState('shadow', 0);
      expect(state.lastInteractionTimestamps).toEqual({ tap: 0, warm: 0, talk: 0 });
    });
  });
});
