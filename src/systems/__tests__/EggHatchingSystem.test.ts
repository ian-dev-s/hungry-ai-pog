import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EggHatchingSystem } from '../EggHatchingSystem';
import {
  ALL_EGG_ELEMENTS,
  EGG_TYPES,
  EGG_INTERACTION_EFFECTS,
  createDefaultEggState,
  getEggVisualStage,
} from '../../data/EggConfig';
import type { HatchThresholds } from '../../data/EggConfig';

/** Short thresholds for testing (avoids real-time waits). */
const TEST_THRESHOLDS: HatchThresholds = {
  minInteractionProgress: 20,
  minWallClockMs: 100,
  maxWallClockMs: 500,
};

describe('EggHatchingSystem', () => {
  let system: EggHatchingSystem;
  const t0 = 1_000_000;

  beforeEach(() => {
    system = new EggHatchingSystem(TEST_THRESHOLDS);
  });

  describe('selectEgg', () => {
    it('creates an egg with the selected element', () => {
      const state = system.selectEgg('forest', t0);
      expect(state.element).toBe('forest');
      expect(state.obtainedTimestamp).toBe(t0);
      expect(state.hatched).toBe(false);
      expect(state.totalInteractions).toBe(0);
    });

    it('supports all six elemental types', () => {
      for (const element of ALL_EGG_ELEMENTS) {
        const s = new EggHatchingSystem(TEST_THRESHOLDS);
        const state = s.selectEgg(element, t0);
        expect(state.element).toBe(element);
        expect(EGG_TYPES[element]).toBeDefined();
      }
    });
  });

  describe('hasActiveEgg', () => {
    it('returns false when no egg selected', () => {
      expect(system.hasActiveEgg()).toBe(false);
    });

    it('returns true after selecting an egg', () => {
      system.selectEgg('fire', t0);
      expect(system.hasActiveEgg()).toBe(true);
    });

    it('returns false after egg is hatched', () => {
      system.selectEgg('fire', t0);
      // Force enough interactions and time
      for (let i = 0; i < 50; i++) {
        system.interact('tap', t0 + i * 3000);
      }
      system.hatch('TestPet', t0 + 600);
      expect(system.hasActiveEgg()).toBe(false);
    });
  });

  describe('interact', () => {
    it('returns false when no egg exists', () => {
      expect(system.interact('tap', t0)).toBe(false);
    });

    it('accumulates interaction progress', () => {
      system.selectEgg('forest', t0);
      system.interact('tap', t0 + 3000);
      const state = system.getState()!;
      expect(state.interactionProgress).toBeGreaterThan(0);
      expect(state.totalInteractions).toBe(1);
    });

    it('applies element-specific multipliers', () => {
      const s1 = new EggHatchingSystem(TEST_THRESHOLDS);
      const s2 = new EggHatchingSystem(TEST_THRESHOLDS);

      s1.selectEgg('fire', t0); // fire warm multiplier: 1.3
      s2.selectEgg('shadow', t0); // shadow warm multiplier: 0.7

      s1.interact('warm', t0 + 6000);
      s2.interact('warm', t0 + 6000);

      const state1 = s1.getState()!;
      const state2 = s2.getState()!;
      expect(state1.interactionProgress).toBeGreaterThan(state2.interactionProgress);
    });

    it('applies cooldown scaling when interacting rapidly', () => {
      system.selectEgg('forest', t0);
      system.interact('tap', t0 + 3000); // full cooldown elapsed
      const prog1 = system.getState()!.interactionProgress;

      system.interact('tap', t0 + 3100); // only 100ms later, tap cooldown is 2000ms
      const prog2 = system.getState()!.interactionProgress;
      const secondGain = prog2 - prog1;

      // Second interaction should have reduced effect due to cooldown
      expect(secondGain).toBeLessThan(prog1);
    });

    it('accumulates personality influence', () => {
      system.selectEgg('aquatic', t0);
      const beforeSocial = system.getState()!.personalityAccumulator[2];

      system.interact('talk', t0 + 4000);
      const afterSocial = system.getState()!.personalityAccumulator[2];

      // Talk influences social axis (index 2) positively
      expect(afterSocial).toBeGreaterThan(beforeSocial);
    });

    it('accumulates stat influence', () => {
      system.selectEgg('cosmic', t0);
      const beforeTrust = system.getState()!.statAccumulator.trust;

      system.interact('warm', t0 + 6000);
      const afterTrust = system.getState()!.statAccumulator.trust;

      expect(afterTrust).toBeGreaterThan(beforeTrust);
    });

    it('emits interaction event', () => {
      system.selectEgg('crystal', t0);
      const listener = vi.fn();
      system.on(listener);

      system.interact('tap', t0 + 3000);
      expect(listener).toHaveBeenCalledWith('interaction', expect.any(Object));
    });

    it('emits hatch_ready when conditions met', () => {
      system.selectEgg('forest', t0);
      const listener = vi.fn();
      system.on(listener);

      // Build up enough interaction progress
      for (let i = 0; i < 20; i++) {
        system.interact('warm', t0 + 200 + i * 6000);
      }

      const hatchReadyCalls = listener.mock.calls.filter(
        (c: unknown[]) => c[0] === 'hatch_ready',
      );
      expect(hatchReadyCalls.length).toBeGreaterThan(0);
    });
  });

  describe('getHatchProgress', () => {
    it('returns 0 when no egg exists', () => {
      expect(system.getHatchProgress()).toBe(0);
    });

    it('returns 1 when egg is already hatched', () => {
      system.selectEgg('fire', t0);
      for (let i = 0; i < 20; i++) {
        system.interact('warm', t0 + 200 + i * 6000);
      }
      system.hatch('Pet', t0 + 600);
      expect(system.getHatchProgress()).toBe(1);
    });

    it('increases with interactions', () => {
      system.selectEgg('forest', t0);
      const before = system.getHatchProgress(t0);
      system.interact('tap', t0 + 3000);
      const after = system.getHatchProgress(t0 + 3000);
      expect(after).toBeGreaterThan(before);
    });

    it('increases with wall-clock time', () => {
      system.selectEgg('forest', t0);
      const early = system.getHatchProgress(t0 + 50);
      const late = system.getHatchProgress(t0 + 400);
      expect(late).toBeGreaterThan(early);
    });

    it('combines 70% interaction and 30% time', () => {
      system.selectEgg('forest', t0);
      // Max wall clock progress but no interactions
      const timeOnly = system.getHatchProgress(t0 + 600);
      expect(timeOnly).toBeCloseTo(0.3, 1);
    });
  });

  describe('isReadyToHatch', () => {
    it('returns false for new egg', () => {
      system.selectEgg('forest', t0);
      expect(system.isReadyToHatch(t0)).toBe(false);
    });

    it('returns true when both time and interaction thresholds met', () => {
      system.selectEgg('forest', t0);
      // Build interaction progress
      for (let i = 0; i < 20; i++) {
        system.interact('warm', t0 + 200 + i * 6000);
      }
      expect(system.isReadyToHatch(t0 + 200 + 19 * 6000)).toBe(true);
    });

    it('auto-hatches after max wall clock time', () => {
      system.selectEgg('forest', t0);
      expect(system.isReadyToHatch(t0 + 500)).toBe(true);
    });

    it('requires minimum time even with enough interactions', () => {
      system.selectEgg('forest', t0);
      // Lots of interactions but no time
      for (let i = 0; i < 50; i++) {
        system.interact('tap', t0 + 10 + i * 3000);
      }
      // Only 10ms has passed from obtainedTimestamp but interactions at future times
      // Check at t0 + 50 (less than minWallClockMs=100)
      expect(system.isReadyToHatch(t0 + 50)).toBe(false);
    });
  });

  describe('hatch', () => {
    it('returns null when not ready', () => {
      system.selectEgg('forest', t0);
      expect(system.hatch('Pet', t0)).toBeNull();
    });

    it('creates PetState in blob stage with accumulated stats', () => {
      system.selectEgg('aquatic', t0);
      for (let i = 0; i < 20; i++) {
        system.interact('talk', t0 + 200 + i * 4000);
      }
      const hatchTime = t0 + 200 + 19 * 4000;
      const pet = system.hatch('Bubbles', hatchTime);

      expect(pet).not.toBeNull();
      expect(pet!.name).toBe('Bubbles');
      expect(pet!.elementType).toBe('aquatic');
      expect(pet!.lifeStage).toBe('blob');
      expect(pet!.birthTimestamp).toBe(hatchTime);
      expect(pet!.stats.bond).toBeGreaterThan(0);
      expect(pet!.hiddenStats.trust).toBeGreaterThan(0);
    });

    it('emits hatched event', () => {
      system.selectEgg('fire', t0);
      const listener = vi.fn();
      system.on(listener);

      for (let i = 0; i < 20; i++) {
        system.interact('warm', t0 + 200 + i * 6000);
      }
      system.hatch('Ember', t0 + 200 + 19 * 6000);

      const hatchedCalls = listener.mock.calls.filter(
        (c: unknown[]) => c[0] === 'hatched',
      );
      expect(hatchedCalls.length).toBe(1);
    });

    it('returns null on second hatch attempt', () => {
      system.selectEgg('fire', t0);
      for (let i = 0; i < 20; i++) {
        system.interact('warm', t0 + 200 + i * 6000);
      }
      const hatchTime = t0 + 200 + 19 * 6000;
      system.hatch('Ember', hatchTime);
      expect(system.hatch('Ember2', hatchTime)).toBeNull();
    });
  });

  describe('loadState', () => {
    it('restores egg state from a saved snapshot', () => {
      const eggState = createDefaultEggState('shadow', t0);
      eggState.interactionProgress = 50;
      eggState.totalInteractions = 10;

      system.loadState(eggState);
      const state = system.getState()!;
      expect(state.element).toBe('shadow');
      expect(state.interactionProgress).toBe(50);
      expect(state.totalInteractions).toBe(10);
    });
  });

  describe('cooldown helpers', () => {
    it('isInteractionReady checks cooldown', () => {
      system.selectEgg('forest', t0);
      system.interact('tap', t0 + 3000);
      expect(system.isInteractionReady('tap', t0 + 3000)).toBe(false);
      expect(system.isInteractionReady('tap', t0 + 6000)).toBe(true);
    });

    it('getCooldownRemaining returns remaining ms', () => {
      system.selectEgg('forest', t0);
      system.interact('warm', t0 + 6000);
      const remaining = system.getCooldownRemaining('warm', t0 + 7000);
      expect(remaining).toBe(EGG_INTERACTION_EFFECTS.warm.cooldownMs - 1000);
    });
  });

  describe('visual stages', () => {
    it('getVisualStage returns correct stage for progress', () => {
      expect(getEggVisualStage(0).label).toBe('dormant');
      expect(getEggVisualStage(0.3).label).toBe('stirring');
      expect(getEggVisualStage(0.6).label).toBe('glowing');
      expect(getEggVisualStage(0.8).label).toBe('cracking');
      expect(getEggVisualStage(0.98).label).toBe('hatching');
    });
  });

  describe('event unsubscribe', () => {
    it('stops receiving events after unsubscribe', () => {
      system.selectEgg('forest', t0);
      const listener = vi.fn();
      const unsub = system.on(listener);
      unsub();

      system.interact('tap', t0 + 3000);
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
