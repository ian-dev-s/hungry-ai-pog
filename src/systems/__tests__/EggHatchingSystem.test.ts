import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EggHatchingSystem } from '../EggHatchingSystem';
import type { EggEventType } from '../EggHatchingSystem';
import {
  DEFAULT_HATCH_THRESHOLDS,
  EGG_INTERACTION_EFFECTS,
  EGG_TYPES,
  createDefaultEggState,
  type EggState,
  type HatchThresholds,
} from '../../data/EggConfig';

const MINUTE = 60_000;
const HOUR = 3_600_000;
const BASE_TIME = 1_000_000_000;

/** Create fast thresholds for testing. */
function fastThresholds(): HatchThresholds {
  return {
    minInteractionProgress: 20,
    minWallClockMs: 1_000,
    maxWallClockMs: 10_000,
  };
}

describe('EggHatchingSystem', () => {
  let system: EggHatchingSystem;

  beforeEach(() => {
    system = new EggHatchingSystem(fastThresholds());
  });

  // ─── Egg Selection ──────────────────────────────────────────────────────────

  describe('selectEgg', () => {
    it('creates a new egg with the specified element', () => {
      const state = system.selectEgg('forest', BASE_TIME);
      expect(state.element).toBe('forest');
      expect(state.hatched).toBe(false);
      expect(state.obtainedTimestamp).toBe(BASE_TIME);
      expect(state.interactionProgress).toBe(0);
      expect(state.totalInteractions).toBe(0);
    });

    it('supports all six elemental categories', () => {
      const elements = ['forest', 'aquatic', 'fire', 'cosmic', 'shadow', 'crystal'] as const;
      for (const el of elements) {
        const sys = new EggHatchingSystem(fastThresholds());
        const state = sys.selectEgg(el, BASE_TIME);
        expect(state.element).toBe(el);
        expect(EGG_TYPES[el]).toBeDefined();
      }
    });

    it('initializes personality accumulator at midpoint', () => {
      const state = system.selectEgg('cosmic', BASE_TIME);
      expect(state.personalityAccumulator).toEqual([0.5, 0.5, 0.5, 0.5]);
    });

    it('initializes stat accumulator with default values', () => {
      const state = system.selectEgg('fire', BASE_TIME);
      expect(state.statAccumulator).toEqual({ trust: 50, bond: 50 });
    });
  });

  // ─── State Management ───────────────────────────────────────────────────────

  describe('state management', () => {
    it('returns null when no egg selected', () => {
      expect(system.getState()).toBeNull();
      expect(system.hasActiveEgg()).toBe(false);
    });

    it('returns a copy of state (not a reference)', () => {
      system.selectEgg('forest', BASE_TIME);
      const s1 = system.getState();
      const s2 = system.getState();
      expect(s1).toEqual(s2);
      expect(s1).not.toBe(s2);
    });

    it('loads saved state', () => {
      const saved = createDefaultEggState('aquatic', BASE_TIME);
      saved.interactionProgress = 15;
      saved.totalInteractions = 5;
      system.loadState(saved);

      const loaded = system.getState()!;
      expect(loaded.element).toBe('aquatic');
      expect(loaded.interactionProgress).toBe(15);
      expect(loaded.totalInteractions).toBe(5);
    });

    it('hasActiveEgg returns false after hatching', () => {
      system.selectEgg('forest', BASE_TIME);
      expect(system.hasActiveEgg()).toBe(true);

      // Force ready state and hatch
      const state = system.getState()!;
      state.interactionProgress = 100;
      state.obtainedTimestamp = BASE_TIME - 100_000;
      system.loadState(state);
      system.hatch('TestPet', BASE_TIME);
      expect(system.hasActiveEgg()).toBe(false);
    });
  });

  // ─── Interactions ───────────────────────────────────────────────────────────

  describe('interact', () => {
    it('returns false when no egg is active', () => {
      expect(system.interact('tap', BASE_TIME)).toBe(false);
    });

    it('returns false on a hatched egg', () => {
      system.selectEgg('forest', BASE_TIME);
      const state = system.getState()!;
      state.interactionProgress = 100;
      state.obtainedTimestamp = BASE_TIME - 100_000;
      system.loadState(state);
      system.hatch('TestPet', BASE_TIME);
      expect(system.interact('tap', BASE_TIME)).toBe(false);
    });

    it('increases interaction progress for tap', () => {
      system.selectEgg('forest', BASE_TIME);
      // First interaction after long cooldown gets full effect
      system.interact('tap', BASE_TIME);
      const state = system.getState()!;
      expect(state.interactionProgress).toBeGreaterThan(0);
      expect(state.totalInteractions).toBe(1);
    });

    it('increases interaction progress for warm', () => {
      system.selectEgg('forest', BASE_TIME);
      system.interact('warm', BASE_TIME);
      const state = system.getState()!;
      expect(state.interactionProgress).toBeGreaterThan(0);
    });

    it('increases interaction progress for talk', () => {
      system.selectEgg('forest', BASE_TIME);
      system.interact('talk', BASE_TIME);
      const state = system.getState()!;
      expect(state.interactionProgress).toBeGreaterThan(0);
    });

    it('applies elemental multipliers', () => {
      // Fire has tap multiplier 1.2, forest has 1.0
      const fireSys = new EggHatchingSystem(fastThresholds());
      fireSys.selectEgg('fire', BASE_TIME);
      fireSys.interact('tap', BASE_TIME);
      const fireProgress = fireSys.getState()!.interactionProgress;

      const forestSys = new EggHatchingSystem(fastThresholds());
      forestSys.selectEgg('forest', BASE_TIME);
      forestSys.interact('tap', BASE_TIME);
      const forestProgress = forestSys.getState()!.interactionProgress;

      expect(fireProgress).toBeGreaterThan(forestProgress);
    });

    it('accumulates personality influence', () => {
      system.selectEgg('forest', BASE_TIME);
      const before = system.getState()!.personalityAccumulator.slice();
      system.interact('tap', BASE_TIME);
      const after = system.getState()!.personalityAccumulator;
      // tap has personalityInfluence: [0.02, 0.03, 0.0, -0.01]
      // At least some axes should change
      const changed = after.some((val, i) => val !== before[i]);
      expect(changed).toBe(true);
    });

    it('accumulates stat influence (trust and bond)', () => {
      system.selectEgg('forest', BASE_TIME);
      const before = system.getState()!.statAccumulator;
      system.interact('tap', BASE_TIME);
      const after = system.getState()!.statAccumulator;
      // tap has statInfluence: { trust: 1, bond: 2 }
      expect(after.trust).toBeGreaterThanOrEqual(before.trust);
      expect(after.bond).toBeGreaterThanOrEqual(before.bond);
    });

    it('clamps personality accumulator between 0 and 1', () => {
      system.selectEgg('forest', BASE_TIME);
      // Do many interactions to push values toward extremes
      for (let i = 0; i < 100; i++) {
        system.interact('tap', BASE_TIME + i * 10_000);
      }
      const state = system.getState()!;
      for (const val of state.personalityAccumulator) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    });

    it('clamps stat accumulator between 0 and 100', () => {
      system.selectEgg('forest', BASE_TIME);
      for (let i = 0; i < 100; i++) {
        system.interact('warm', BASE_TIME + i * 10_000);
      }
      const state = system.getState()!;
      expect(state.statAccumulator.trust).toBeGreaterThanOrEqual(0);
      expect(state.statAccumulator.trust).toBeLessThanOrEqual(100);
      expect(state.statAccumulator.bond).toBeGreaterThanOrEqual(0);
      expect(state.statAccumulator.bond).toBeLessThanOrEqual(100);
    });
  });

  // ─── Cooldown Mechanics ─────────────────────────────────────────────────────

  describe('cooldowns', () => {
    it('scales down effect when interaction is on cooldown', () => {
      system.selectEgg('forest', BASE_TIME);
      system.interact('tap', BASE_TIME);
      const afterFirst = system.getState()!.interactionProgress;

      // Immediately interact again (within cooldown)
      system.interact('tap', BASE_TIME + 100);
      const afterSecond = system.getState()!.interactionProgress;

      // Second interaction should add less progress due to cooldown scaling
      const firstGain = afterFirst;
      const secondGain = afterSecond - afterFirst;
      expect(secondGain).toBeLessThan(firstGain);
    });

    it('gives full effect after cooldown expires', () => {
      system.selectEgg('forest', BASE_TIME);
      system.interact('tap', BASE_TIME);
      const firstGain = system.getState()!.interactionProgress;

      // Wait for full cooldown (tap cooldown is 2000ms)
      system.interact('tap', BASE_TIME + 5_000);
      const secondGain = system.getState()!.interactionProgress - firstGain;

      expect(secondGain).toBeCloseTo(firstGain, 1);
    });

    it('isInteractionReady returns correct state', () => {
      system.selectEgg('forest', BASE_TIME);
      expect(system.isInteractionReady('tap', BASE_TIME)).toBe(true);

      system.interact('tap', BASE_TIME);
      expect(system.isInteractionReady('tap', BASE_TIME + 100)).toBe(false);
      expect(system.isInteractionReady('tap', BASE_TIME + 5_000)).toBe(true);
    });

    it('getCooldownRemaining returns correct values', () => {
      system.selectEgg('forest', BASE_TIME);
      system.interact('tap', BASE_TIME);
      const cooldownMs = EGG_INTERACTION_EFFECTS.tap.cooldownMs;

      expect(system.getCooldownRemaining('tap', BASE_TIME + 500)).toBe(cooldownMs - 500);
      expect(system.getCooldownRemaining('tap', BASE_TIME + cooldownMs + 1)).toBe(0);
    });

    it('getCooldownRemaining returns 0 when no egg', () => {
      expect(system.getCooldownRemaining('tap', BASE_TIME)).toBe(0);
    });
  });

  // ─── Hatch Progress ─────────────────────────────────────────────────────────

  describe('getHatchProgress', () => {
    it('returns 0 when no egg', () => {
      expect(system.getHatchProgress(BASE_TIME)).toBe(0);
    });

    it('returns 1 when egg is hatched', () => {
      system.selectEgg('forest', BASE_TIME);
      const state = system.getState()!;
      state.interactionProgress = 100;
      state.obtainedTimestamp = BASE_TIME - 100_000;
      system.loadState(state);
      system.hatch('TestPet', BASE_TIME);
      expect(system.getHatchProgress(BASE_TIME)).toBe(1);
    });

    it('combines interaction progress (70%) and wall clock (30%)', () => {
      const thresholds = fastThresholds();
      const sys = new EggHatchingSystem(thresholds);
      sys.selectEgg('forest', BASE_TIME);

      // Set interaction progress to 100%
      const state = sys.getState()!;
      state.interactionProgress = thresholds.minInteractionProgress;
      sys.loadState(state);

      // No wall clock progress yet (before minWallClockMs)
      const progressNoTime = sys.getHatchProgress(BASE_TIME);
      expect(progressNoTime).toBeCloseTo(0.7, 1);

      // With full wall clock time
      const progressFullTime = sys.getHatchProgress(BASE_TIME + thresholds.maxWallClockMs);
      expect(progressFullTime).toBe(1);
    });

    it('increases over time even without interactions', () => {
      system.selectEgg('forest', BASE_TIME);
      const p1 = system.getHatchProgress(BASE_TIME);
      const p2 = system.getHatchProgress(BASE_TIME + 5_000);
      expect(p2).toBeGreaterThanOrEqual(p1);
    });
  });

  // ─── Visual Stages ─────────────────────────────────────────────────────────

  describe('getVisualStage', () => {
    it('starts at dormant stage', () => {
      system.selectEgg('forest', BASE_TIME);
      const stage = system.getVisualStage(BASE_TIME);
      expect(stage.label).toBe('dormant');
      expect(stage.wobble).toBe(false);
      expect(stage.glow).toBe(false);
      expect(stage.cracks).toBe(0);
    });

    it('progresses through visual stages with higher progress', () => {
      const thresholds = fastThresholds();
      const sys = new EggHatchingSystem(thresholds);
      sys.selectEgg('forest', BASE_TIME);

      // Push interaction progress to get stirring (25%+)
      const state = sys.getState()!;
      state.interactionProgress = thresholds.minInteractionProgress * 0.5;
      sys.loadState(state);

      const midStage = sys.getVisualStage(BASE_TIME + thresholds.minWallClockMs);
      // Should be past dormant
      expect(['stirring', 'glowing', 'cracking', 'hatching']).toContain(midStage.label);
    });
  });

  // ─── Hatching Conditions ────────────────────────────────────────────────────

  describe('isReadyToHatch', () => {
    it('returns false when no egg', () => {
      expect(system.isReadyToHatch(BASE_TIME)).toBe(false);
    });

    it('returns false when already hatched', () => {
      system.selectEgg('forest', BASE_TIME);
      const state = system.getState()!;
      state.interactionProgress = 100;
      state.obtainedTimestamp = BASE_TIME - 100_000;
      system.loadState(state);
      system.hatch('TestPet', BASE_TIME);
      expect(system.isReadyToHatch(BASE_TIME)).toBe(false);
    });

    it('requires both min wall clock time AND min interaction progress', () => {
      const thresholds = fastThresholds();
      const sys = new EggHatchingSystem(thresholds);
      sys.selectEgg('forest', BASE_TIME);

      // Only interaction progress met
      const state1 = sys.getState()!;
      state1.interactionProgress = thresholds.minInteractionProgress;
      sys.loadState(state1);
      expect(sys.isReadyToHatch(BASE_TIME + 500)).toBe(false);

      // Only wall clock met
      const state2 = sys.getState()!;
      state2.interactionProgress = 0;
      sys.loadState(state2);
      expect(sys.isReadyToHatch(BASE_TIME + thresholds.minWallClockMs + 1)).toBe(false);

      // Both met
      const state3 = sys.getState()!;
      state3.interactionProgress = thresholds.minInteractionProgress;
      sys.loadState(state3);
      expect(sys.isReadyToHatch(BASE_TIME + thresholds.minWallClockMs + 1)).toBe(true);
    });

    it('auto-hatches when max wall clock time exceeded', () => {
      const thresholds = fastThresholds();
      const sys = new EggHatchingSystem(thresholds);
      sys.selectEgg('forest', BASE_TIME);
      // No interactions at all, but max time exceeded
      expect(sys.isReadyToHatch(BASE_TIME + thresholds.maxWallClockMs)).toBe(true);
    });
  });

  // ─── Hatch ──────────────────────────────────────────────────────────────────

  describe('hatch', () => {
    it('returns null when no egg', () => {
      expect(system.hatch('TestPet', BASE_TIME)).toBeNull();
    });

    it('returns null when not ready', () => {
      system.selectEgg('forest', BASE_TIME);
      expect(system.hatch('TestPet', BASE_TIME)).toBeNull();
    });

    it('returns null when already hatched', () => {
      system.selectEgg('forest', BASE_TIME);
      const state = system.getState()!;
      state.interactionProgress = 100;
      state.obtainedTimestamp = BASE_TIME - 100_000;
      system.loadState(state);
      system.hatch('TestPet', BASE_TIME);
      expect(system.hatch('AnotherPet', BASE_TIME)).toBeNull();
    });

    it('creates PetState in blob stage with correct name', () => {
      system.selectEgg('fire', BASE_TIME);
      const state = system.getState()!;
      state.interactionProgress = 100;
      state.obtainedTimestamp = BASE_TIME - 100_000;
      system.loadState(state);

      const pet = system.hatch('Ember', BASE_TIME)!;
      expect(pet).not.toBeNull();
      expect(pet.name).toBe('Ember');
      expect(pet.lifeStage).toBe('blob');
      expect(pet.elementType).toBe('fire');
      expect(pet.birthTimestamp).toBe(BASE_TIME);
    });

    it('transfers personality accumulator to pet hidden stats', () => {
      system.selectEgg('cosmic', BASE_TIME);
      const state = system.getState()!;
      state.interactionProgress = 100;
      state.obtainedTimestamp = BASE_TIME - 100_000;
      state.personalityAccumulator = [0.3, 0.7, 0.6, 0.4];
      system.loadState(state);

      const pet = system.hatch('Star', BASE_TIME)!;
      expect(pet.hiddenStats.personality).toEqual([0.3, 0.7, 0.6, 0.4]);
    });

    it('transfers stat accumulator to pet stats', () => {
      system.selectEgg('aquatic', BASE_TIME);
      const state = system.getState()!;
      state.interactionProgress = 100;
      state.obtainedTimestamp = BASE_TIME - 100_000;
      state.statAccumulator = { trust: 80, bond: 70 };
      system.loadState(state);

      const pet = system.hatch('Splash', BASE_TIME)!;
      expect(pet.hiddenStats.trust).toBe(80);
      expect(pet.stats.bond).toBe(70);
    });

    it('clamps bond to 100', () => {
      system.selectEgg('forest', BASE_TIME);
      const state = system.getState()!;
      state.interactionProgress = 100;
      state.obtainedTimestamp = BASE_TIME - 100_000;
      state.statAccumulator = { trust: 150, bond: 150 };
      system.loadState(state);

      const pet = system.hatch('Tree', BASE_TIME)!;
      expect(pet.stats.bond).toBe(100);
      expect(pet.hiddenStats.trust).toBe(100);
    });

    it('sets initial stats to expected defaults', () => {
      system.selectEgg('forest', BASE_TIME);
      const state = system.getState()!;
      state.interactionProgress = 100;
      state.obtainedTimestamp = BASE_TIME - 100_000;
      system.loadState(state);

      const pet = system.hatch('Leafy', BASE_TIME)!;
      expect(pet.stats.hunger).toBe(80);
      expect(pet.stats.happiness).toBe(90);
      expect(pet.stats.energy).toBe(100);
      expect(pet.stats.hygiene).toBe(100);
      expect(pet.stats.health).toBe(100);
      expect(pet.stats.discipline).toBe(50);
      expect(pet.hiddenStats.stress).toBe(0);
    });

    it('marks egg as hatched', () => {
      system.selectEgg('forest', BASE_TIME);
      const state = system.getState()!;
      state.interactionProgress = 100;
      state.obtainedTimestamp = BASE_TIME - 100_000;
      system.loadState(state);
      system.hatch('Leafy', BASE_TIME);

      expect(system.getState()!.hatched).toBe(true);
      expect(system.hasActiveEgg()).toBe(false);
    });
  });

  // ─── Event System ───────────────────────────────────────────────────────────

  describe('events', () => {
    it('emits interaction event on interact', () => {
      system.selectEgg('forest', BASE_TIME);
      const events: EggEventType[] = [];
      system.on((type) => events.push(type));

      system.interact('tap', BASE_TIME);
      expect(events).toContain('interaction');
    });

    it('emits hatch_ready when conditions are met via interaction', () => {
      const thresholds = fastThresholds();
      const sys = new EggHatchingSystem(thresholds);
      sys.selectEgg('forest', BASE_TIME);

      // Pre-load enough interaction progress so next interaction triggers ready
      const state = sys.getState()!;
      state.interactionProgress = thresholds.minInteractionProgress - 1;
      state.obtainedTimestamp = BASE_TIME - thresholds.minWallClockMs - 1;
      sys.loadState(state);

      const events: EggEventType[] = [];
      sys.on((type) => events.push(type));

      // This interaction should push past threshold
      sys.interact('tap', BASE_TIME);
      expect(events).toContain('hatch_ready');
    });

    it('emits hatched event on hatch', () => {
      system.selectEgg('forest', BASE_TIME);
      const state = system.getState()!;
      state.interactionProgress = 100;
      state.obtainedTimestamp = BASE_TIME - 100_000;
      system.loadState(state);

      const events: EggEventType[] = [];
      system.on((type) => events.push(type));

      system.hatch('TestPet', BASE_TIME);
      expect(events).toContain('hatched');
    });

    it('unsubscribe stops event delivery', () => {
      system.selectEgg('forest', BASE_TIME);
      const events: EggEventType[] = [];
      const unsub = system.on((type) => events.push(type));

      system.interact('tap', BASE_TIME);
      expect(events.length).toBe(1);

      unsub();
      system.interact('warm', BASE_TIME + 10_000);
      expect(events.length).toBe(1);
    });
  });

  // ─── Session Persistence ────────────────────────────────────────────────────

  describe('session persistence', () => {
    it('egg state persists through load/save cycle', () => {
      system.selectEgg('shadow', BASE_TIME);
      system.interact('tap', BASE_TIME);
      system.interact('warm', BASE_TIME + 5_000);

      const saved = system.getState()!;

      const newSystem = new EggHatchingSystem(fastThresholds());
      newSystem.loadState(saved);
      const loaded = newSystem.getState()!;

      expect(loaded.element).toBe('shadow');
      expect(loaded.totalInteractions).toBe(2);
      expect(loaded.interactionProgress).toBe(saved.interactionProgress);
      expect(loaded.personalityAccumulator).toEqual(saved.personalityAccumulator);
      expect(loaded.statAccumulator).toEqual(saved.statAccumulator);
    });

    it('wall clock progress continues after reload', () => {
      system.selectEgg('crystal', BASE_TIME);
      const saved = system.getState()!;

      const newSystem = new EggHatchingSystem(fastThresholds());
      newSystem.loadState(saved);

      // Time has passed since save
      const laterTime = BASE_TIME + 5_000;
      const progress = newSystem.getHatchProgress(laterTime);
      expect(progress).toBeGreaterThan(0);
    });
  });

  // ─── Default Thresholds ─────────────────────────────────────────────────────

  describe('default thresholds', () => {
    it('uses production defaults when no thresholds provided', () => {
      const defaultSys = new EggHatchingSystem();
      defaultSys.selectEgg('forest', BASE_TIME);

      // With default thresholds: 30 min wall clock, 100 interaction progress
      expect(defaultSys.isReadyToHatch(BASE_TIME)).toBe(false);

      // Should not be ready even with some time
      expect(defaultSys.isReadyToHatch(BASE_TIME + 10 * MINUTE)).toBe(false);

      // Auto-hatch at 2 hours
      expect(defaultSys.isReadyToHatch(BASE_TIME + 2 * HOUR)).toBe(true);
    });
  });
});
