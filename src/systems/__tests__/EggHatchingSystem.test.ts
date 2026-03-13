import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EggHatchingSystem } from '../EggHatchingSystem';
import type { EggEventType } from '../EggHatchingSystem';
import {
  DEFAULT_HATCH_THRESHOLDS,
  EGG_INTERACTION_EFFECTS,
  createDefaultEggState,
  type EggState,
  type HatchThresholds,
} from '../../data/EggConfig';

const BASE_TIME = 1_000_000_000;

/** Thresholds with short times for easier testing. */
const TEST_THRESHOLDS: HatchThresholds = {
  minInteractionProgress: 50,
  minWallClockMs: 1_000,
  maxWallClockMs: 10_000,
};

describe('EggHatchingSystem', () => {
  let system: EggHatchingSystem;

  beforeEach(() => {
    system = new EggHatchingSystem(TEST_THRESHOLDS);
  });

  describe('selectEgg', () => {
    it('creates a new egg with the given element', () => {
      const state = system.selectEgg('forest', BASE_TIME);
      expect(state.element).toBe('forest');
      expect(state.hatched).toBe(false);
      expect(state.interactionProgress).toBe(0);
      expect(state.totalInteractions).toBe(0);
      expect(state.obtainedTimestamp).toBe(BASE_TIME);
    });

    it('creates eggs for all element types', () => {
      const elements = ['forest', 'aquatic', 'fire', 'cosmic', 'shadow', 'crystal'] as const;
      for (const element of elements) {
        const sys = new EggHatchingSystem(TEST_THRESHOLDS);
        const state = sys.selectEgg(element, BASE_TIME);
        expect(state.element).toBe(element);
      }
    });

    it('returns a copy of the state', () => {
      const state = system.selectEgg('fire', BASE_TIME);
      state.interactionProgress = 999;
      expect(system.getState()!.interactionProgress).toBe(0);
    });
  });

  describe('loadState / getState', () => {
    it('loads and returns egg state', () => {
      const original = createDefaultEggState('aquatic', BASE_TIME);
      original.interactionProgress = 42;

      system.loadState(original);
      const loaded = system.getState();

      expect(loaded).not.toBeNull();
      expect(loaded!.element).toBe('aquatic');
      expect(loaded!.interactionProgress).toBe(42);
    });

    it('returns a copy so mutations do not affect internal state', () => {
      system.selectEgg('cosmic', BASE_TIME);
      const copy = system.getState()!;
      copy.totalInteractions = 999;
      expect(system.getState()!.totalInteractions).toBe(0);
    });

    it('returns null when no egg exists', () => {
      expect(system.getState()).toBeNull();
    });
  });

  describe('hasActiveEgg', () => {
    it('returns false with no egg', () => {
      expect(system.hasActiveEgg()).toBe(false);
    });

    it('returns true after selecting an egg', () => {
      system.selectEgg('forest', BASE_TIME);
      expect(system.hasActiveEgg()).toBe(true);
    });

    it('returns false after egg has hatched', () => {
      system.selectEgg('fire', BASE_TIME);
      // Force enough progress and time to hatch
      for (let i = 0; i < 20; i++) {
        system.interact('tap', BASE_TIME + i * 10_000);
        system.interact('warm', BASE_TIME + i * 10_000 + 100);
        system.interact('talk', BASE_TIME + i * 10_000 + 200);
      }
      system.hatch('TestPet', BASE_TIME + 200_000);
      expect(system.hasActiveEgg()).toBe(false);
    });
  });

  describe('interact', () => {
    it('returns false if no egg exists', () => {
      expect(system.interact('tap', BASE_TIME)).toBe(false);
    });

    it('returns false if egg is already hatched', () => {
      system.selectEgg('fire', BASE_TIME);
      // Hatch it
      for (let i = 0; i < 20; i++) {
        system.interact('tap', BASE_TIME + i * 10_000);
        system.interact('warm', BASE_TIME + i * 10_000 + 100);
        system.interact('talk', BASE_TIME + i * 10_000 + 200);
      }
      system.hatch('TestPet', BASE_TIME + 200_000);
      expect(system.interact('tap', BASE_TIME + 300_000)).toBe(false);
    });

    it('increments interaction progress on tap', () => {
      system.selectEgg('forest', BASE_TIME);
      system.interact('tap', BASE_TIME + 10_000);
      const state = system.getState()!;
      expect(state.interactionProgress).toBeGreaterThan(0);
      expect(state.totalInteractions).toBe(1);
    });

    it('applies element-specific multipliers', () => {
      // Fire has tap multiplier 1.2, forest has 1.0
      const fireSys = new EggHatchingSystem(TEST_THRESHOLDS);
      const forestSys = new EggHatchingSystem(TEST_THRESHOLDS);

      fireSys.selectEgg('fire', BASE_TIME);
      forestSys.selectEgg('forest', BASE_TIME);

      fireSys.interact('tap', BASE_TIME + 10_000);
      forestSys.interact('tap', BASE_TIME + 10_000);

      expect(fireSys.getState()!.interactionProgress).toBeGreaterThan(
        forestSys.getState()!.interactionProgress,
      );
    });

    it('reduces effectiveness during cooldown', () => {
      system.selectEgg('forest', BASE_TIME);

      // First interaction — full cooldown elapsed (large gap from timestamp 0)
      system.interact('tap', BASE_TIME + 10_000);
      const afterFirst = system.getState()!.interactionProgress;

      // Second interaction immediately — within cooldown
      system.interact('tap', BASE_TIME + 10_001);
      const afterSecond = system.getState()!.interactionProgress;

      const secondGain = afterSecond - afterFirst;
      // Second gain should be much less than first since cooldown barely elapsed
      expect(secondGain).toBeLessThan(afterFirst * 0.1);
    });

    it('accumulates personality influence', () => {
      system.selectEgg('forest', BASE_TIME);
      const before = [...system.getState()!.personalityAccumulator];

      system.interact('talk', BASE_TIME + 10_000);
      const after = system.getState()!.personalityAccumulator;

      // Talk influences social axis (index 2) the most
      expect(after[2]).toBeGreaterThan(before[2]);
    });

    it('accumulates stat influence (trust and bond)', () => {
      system.selectEgg('forest', BASE_TIME);
      const before = { ...system.getState()!.statAccumulator };

      system.interact('warm', BASE_TIME + 10_000);
      const after = system.getState()!.statAccumulator;

      // Warm gives trust: 3, bond: 1
      expect(after.trust).toBeGreaterThan(before.trust);
      expect(after.bond).toBeGreaterThan(before.bond);
    });

    it('clamps personality accumulator to [0, 1]', () => {
      system.selectEgg('forest', BASE_TIME);
      // Do many interactions to push personality values
      for (let i = 0; i < 200; i++) {
        system.interact('talk', BASE_TIME + i * 10_000);
      }
      const state = system.getState()!;
      for (const val of state.personalityAccumulator) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    });

    it('clamps stat accumulator to [0, 100]', () => {
      system.selectEgg('forest', BASE_TIME);
      for (let i = 0; i < 200; i++) {
        system.interact('warm', BASE_TIME + i * 10_000);
      }
      const state = system.getState()!;
      expect(state.statAccumulator.trust).toBeLessThanOrEqual(100);
      expect(state.statAccumulator.bond).toBeLessThanOrEqual(100);
    });

    it('emits interaction event', () => {
      system.selectEgg('forest', BASE_TIME);
      const events: EggEventType[] = [];
      system.on((type) => events.push(type));

      system.interact('tap', BASE_TIME + 10_000);
      expect(events).toContain('interaction');
    });

    it('emits hatch_ready when thresholds met', () => {
      system.selectEgg('forest', BASE_TIME);
      const events: EggEventType[] = [];
      system.on((type) => events.push(type));

      // Exceed both interaction and wall-clock thresholds
      for (let i = 0; i < 20; i++) {
        system.interact('warm', BASE_TIME + 2_000 + i * 10_000);
      }

      expect(events).toContain('hatch_ready');
    });
  });

  describe('getHatchProgress', () => {
    it('returns 0 with no egg', () => {
      expect(system.getHatchProgress()).toBe(0);
    });

    it('returns 1 for hatched egg', () => {
      system.selectEgg('fire', BASE_TIME);
      for (let i = 0; i < 20; i++) {
        system.interact('tap', BASE_TIME + i * 10_000);
        system.interact('warm', BASE_TIME + i * 10_000 + 100);
      }
      system.hatch('TestPet', BASE_TIME + 200_000);
      expect(system.getHatchProgress()).toBe(1);
    });

    it('increases with interactions (70% weight)', () => {
      system.selectEgg('forest', BASE_TIME);
      const before = system.getHatchProgress(BASE_TIME);

      system.interact('warm', BASE_TIME + 10_000);
      const after = system.getHatchProgress(BASE_TIME + 10_000);

      expect(after).toBeGreaterThan(before);
    });

    it('increases with wall-clock time (30% weight)', () => {
      system.selectEgg('forest', BASE_TIME);

      // No interactions, just time passing past minWallClockMs
      const atMin = system.getHatchProgress(BASE_TIME + TEST_THRESHOLDS.minWallClockMs);
      const atMax = system.getHatchProgress(BASE_TIME + TEST_THRESHOLDS.maxWallClockMs);

      expect(atMax).toBeGreaterThan(atMin);
    });

    it('caps at 1.0', () => {
      system.selectEgg('forest', BASE_TIME);
      for (let i = 0; i < 100; i++) {
        system.interact('warm', BASE_TIME + i * 10_000);
      }
      expect(system.getHatchProgress(BASE_TIME + 1_000_000)).toBeLessThanOrEqual(1);
    });
  });

  describe('getVisualStage', () => {
    it('starts at dormant', () => {
      system.selectEgg('forest', BASE_TIME);
      const stage = system.getVisualStage(BASE_TIME);
      expect(stage.label).toBe('dormant');
      expect(stage.wobble).toBe(false);
      expect(stage.glow).toBe(false);
      expect(stage.cracks).toBe(0);
    });

    it('progresses through visual stages', () => {
      system.selectEgg('forest', BASE_TIME);

      // Add enough interactions to get past 25% progress
      for (let i = 0; i < 5; i++) {
        system.interact('warm', BASE_TIME + i * 10_000);
      }

      const stage = system.getVisualStage(BASE_TIME + TEST_THRESHOLDS.minWallClockMs);
      expect(stage.wobble).toBe(true);
    });
  });

  describe('isReadyToHatch', () => {
    it('returns false with no egg', () => {
      expect(system.isReadyToHatch()).toBe(false);
    });

    it('returns false when hatched', () => {
      system.selectEgg('fire', BASE_TIME);
      for (let i = 0; i < 20; i++) {
        system.interact('tap', BASE_TIME + i * 10_000);
        system.interact('warm', BASE_TIME + i * 10_000 + 100);
      }
      system.hatch('TestPet', BASE_TIME + 200_000);
      expect(system.isReadyToHatch(BASE_TIME + 300_000)).toBe(false);
    });

    it('returns false when only wall-clock threshold met', () => {
      system.selectEgg('forest', BASE_TIME);
      // Enough time but no interactions
      expect(system.isReadyToHatch(BASE_TIME + 5_000)).toBe(false);
    });

    it('returns false when only interaction threshold met', () => {
      system.selectEgg('forest', BASE_TIME);
      // Enough interactions but not enough time
      for (let i = 0; i < 20; i++) {
        system.interact('warm', BASE_TIME + i * 100);
      }
      expect(system.isReadyToHatch(BASE_TIME + 500)).toBe(false);
    });

    it('returns true when both thresholds met', () => {
      system.selectEgg('forest', BASE_TIME);
      for (let i = 0; i < 20; i++) {
        system.interact('warm', BASE_TIME + i * 10_000);
      }
      expect(system.isReadyToHatch(BASE_TIME + 200_000)).toBe(true);
    });

    it('auto-hatches when max wall-clock exceeded', () => {
      system.selectEgg('forest', BASE_TIME);
      // No interactions at all, but max time exceeded
      expect(system.isReadyToHatch(BASE_TIME + TEST_THRESHOLDS.maxWallClockMs)).toBe(true);
    });
  });

  describe('hatch', () => {
    function makeReadyToHatch(sys: EggHatchingSystem): void {
      sys.selectEgg('forest', BASE_TIME);
      for (let i = 0; i < 20; i++) {
        sys.interact('warm', BASE_TIME + i * 10_000);
        sys.interact('talk', BASE_TIME + i * 10_000 + 100);
      }
    }

    it('returns null with no egg', () => {
      expect(system.hatch('Test', BASE_TIME)).toBeNull();
    });

    it('returns null if not ready', () => {
      system.selectEgg('forest', BASE_TIME);
      expect(system.hatch('Test', BASE_TIME)).toBeNull();
    });

    it('returns PetState in blob stage on successful hatch', () => {
      makeReadyToHatch(system);
      const pet = system.hatch('Sprout', BASE_TIME + 200_000);

      expect(pet).not.toBeNull();
      expect(pet!.name).toBe('Sprout');
      expect(pet!.lifeStage).toBe('blob');
      expect(pet!.elementType).toBe('forest');
      expect(pet!.birthTimestamp).toBe(BASE_TIME + 200_000);
    });

    it('transfers personality accumulator to hidden stats', () => {
      makeReadyToHatch(system);
      const eggState = system.getState()!;
      const pet = system.hatch('Sprout', BASE_TIME + 200_000);

      expect(pet!.hiddenStats.personality).toEqual(eggState.personalityAccumulator);
    });

    it('transfers bond and trust to pet stats', () => {
      makeReadyToHatch(system);
      const eggState = system.getState()!;
      const pet = system.hatch('Sprout', BASE_TIME + 200_000);

      expect(pet!.stats.bond).toBe(Math.min(100, eggState.statAccumulator.bond));
      expect(pet!.hiddenStats.trust).toBe(Math.min(100, eggState.statAccumulator.trust));
    });

    it('sets initial stats with expected defaults', () => {
      makeReadyToHatch(system);
      const pet = system.hatch('Sprout', BASE_TIME + 200_000)!;

      expect(pet.stats.hunger).toBe(80);
      expect(pet.stats.happiness).toBe(90);
      expect(pet.stats.energy).toBe(100);
      expect(pet.stats.health).toBe(100);
      expect(pet.hiddenStats.stress).toBe(0);
    });

    it('marks egg as hatched', () => {
      makeReadyToHatch(system);
      system.hatch('Sprout', BASE_TIME + 200_000);
      expect(system.hasActiveEgg()).toBe(false);
      expect(system.getState()!.hatched).toBe(true);
    });

    it('emits hatched event', () => {
      makeReadyToHatch(system);
      const events: EggEventType[] = [];
      system.on((type) => events.push(type));

      system.hatch('Sprout', BASE_TIME + 200_000);
      expect(events).toContain('hatched');
    });

    it('returns null on second hatch attempt', () => {
      makeReadyToHatch(system);
      system.hatch('First', BASE_TIME + 200_000);
      expect(system.hatch('Second', BASE_TIME + 300_000)).toBeNull();
    });
  });

  describe('isInteractionReady / getCooldownRemaining', () => {
    it('returns false with no egg', () => {
      expect(system.isInteractionReady('tap')).toBe(false);
    });

    it('returns true when cooldown elapsed', () => {
      system.selectEgg('forest', BASE_TIME);
      system.interact('tap', BASE_TIME + 10_000);

      const cooldown = EGG_INTERACTION_EFFECTS.tap.cooldownMs;
      expect(system.isInteractionReady('tap', BASE_TIME + 10_000 + cooldown)).toBe(true);
    });

    it('returns false when cooldown not elapsed', () => {
      system.selectEgg('forest', BASE_TIME);
      system.interact('tap', BASE_TIME + 10_000);

      expect(system.isInteractionReady('tap', BASE_TIME + 10_001)).toBe(false);
    });

    it('getCooldownRemaining returns 0 with no egg', () => {
      expect(system.getCooldownRemaining('tap')).toBe(0);
    });

    it('getCooldownRemaining returns remaining time', () => {
      system.selectEgg('forest', BASE_TIME);
      system.interact('tap', BASE_TIME + 10_000);

      const remaining = system.getCooldownRemaining('tap', BASE_TIME + 10_500);
      const cooldown = EGG_INTERACTION_EFFECTS.tap.cooldownMs;
      expect(remaining).toBe(cooldown - 500);
    });

    it('getCooldownRemaining returns 0 after cooldown', () => {
      system.selectEgg('forest', BASE_TIME);
      system.interact('tap', BASE_TIME + 10_000);

      const cooldown = EGG_INTERACTION_EFFECTS.tap.cooldownMs;
      expect(system.getCooldownRemaining('tap', BASE_TIME + 10_000 + cooldown + 1)).toBe(0);
    });
  });

  describe('event system', () => {
    it('unsubscribe stops events', () => {
      system.selectEgg('forest', BASE_TIME);
      const events: EggEventType[] = [];
      const unsub = system.on((type) => events.push(type));

      system.interact('tap', BASE_TIME + 10_000);
      const countAfterFirst = events.filter((e) => e === 'interaction').length;
      expect(countAfterFirst).toBe(1);

      unsub();
      system.interact('tap', BASE_TIME + 20_000);
      const countAfterSecond = events.filter((e) => e === 'interaction').length;
      expect(countAfterSecond).toBe(1);
    });

    it('supports multiple listeners', () => {
      system.selectEgg('forest', BASE_TIME);
      const events1: EggEventType[] = [];
      const events2: EggEventType[] = [];

      system.on((type) => events1.push(type));
      system.on((type) => events2.push(type));

      system.interact('tap', BASE_TIME + 10_000);
      expect(events1.filter((e) => e === 'interaction').length).toBe(1);
      expect(events2.filter((e) => e === 'interaction').length).toBe(1);
    });
  });

  describe('uses default thresholds', () => {
    it('constructs with DEFAULT_HATCH_THRESHOLDS when none provided', () => {
      const defaultSystem = new EggHatchingSystem();
      defaultSystem.selectEgg('forest', BASE_TIME);

      // With default thresholds (30 min wall clock), should not be ready right away
      expect(defaultSystem.isReadyToHatch(BASE_TIME + 60_000)).toBe(false);
    });
  });
});
