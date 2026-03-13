/**
 * Core egg state management system.
 * Handles interaction processing, hatch progress calculation,
 * real-time tracking, and transition to the Blob stage.
 */

import type { EggState, EggElement, EggInteractionType } from '@data/EggConfig';
import {
  EGG_TYPES,
  EGG_INTERACTION_EFFECTS,
  DEFAULT_HATCH_THRESHOLDS,
  createDefaultEggState,
  getEggVisualStage,
} from '@data/EggConfig';
import type { HatchThresholds, EggVisualStage } from '@data/EggConfig';
import type { PetState } from '@data/SaveSchema';

// ─── Event Types ────────────────────────────────────────────────────────────

export type EggEventType = 'interaction' | 'hatch_ready' | 'hatched';

export type EggEventListener = (
  type: EggEventType,
  eggState: EggState,
) => void;

// ─── System ─────────────────────────────────────────────────────────────────

export class EggHatchingSystem {
  private eggState: EggState | null = null;
  private thresholds: HatchThresholds;
  private listeners: EggEventListener[] = [];

  constructor(thresholds: HatchThresholds = DEFAULT_HATCH_THRESHOLDS) {
    this.thresholds = thresholds;
  }

  /** Start a new egg with the given element type. */
  selectEgg(element: EggElement, now: number = Date.now()): EggState {
    this.eggState = createDefaultEggState(element, now);
    return this.getState()!;
  }

  /** Load an existing egg state (e.g., from SaveManager). */
  loadState(state: EggState): void {
    this.eggState = { ...state };
  }

  /** Get a copy of the current egg state, or null if no egg. */
  getState(): EggState | null {
    if (!this.eggState) return null;
    return { ...this.eggState };
  }

  /** Check if an egg is currently active (not yet hatched). */
  hasActiveEgg(): boolean {
    return this.eggState !== null && !this.eggState.hatched;
  }

  /**
   * Process a player interaction with the egg.
   * Returns true if the interaction was applied (respecting cooldown).
   */
  interact(type: EggInteractionType, now: number = Date.now()): boolean {
    if (!this.eggState || this.eggState.hatched) return false;

    const effect = EGG_INTERACTION_EFFECTS[type];
    const eggType = EGG_TYPES[this.eggState.element];
    const multiplier = eggType.interactionMultipliers[type];

    // Check cooldown
    const lastTime = this.eggState.lastInteractionTimestamps[type];
    const elapsed = now - lastTime;
    const cooldownFactor = Math.min(1, elapsed / effect.cooldownMs);

    // Apply interaction with cooldown scaling
    const effectivePoints = effect.progressPoints * multiplier * cooldownFactor;
    this.eggState.interactionProgress += effectivePoints;

    // Accumulate personality influence
    for (let i = 0; i < 4; i++) {
      const delta = effect.personalityInfluence[i] * multiplier * cooldownFactor;
      this.eggState.personalityAccumulator[i] = Math.max(
        0,
        Math.min(1, this.eggState.personalityAccumulator[i] + delta),
      );
    }

    // Accumulate stat influence
    this.eggState.statAccumulator.trust = Math.max(
      0,
      Math.min(100, this.eggState.statAccumulator.trust + effect.statInfluence.trust * cooldownFactor),
    );
    this.eggState.statAccumulator.bond = Math.max(
      0,
      Math.min(100, this.eggState.statAccumulator.bond + effect.statInfluence.bond * cooldownFactor),
    );

    this.eggState.lastInteractionTimestamps[type] = now;
    this.eggState.totalInteractions++;

    this.emit('interaction', this.eggState);

    // Check if hatching conditions are met after interaction
    if (this.isReadyToHatch(now)) {
      this.emit('hatch_ready', this.eggState);
    }

    return true;
  }

  /**
   * Calculate normalized hatch progress (0-1).
   * Combines interaction progress and wall-clock time.
   */
  getHatchProgress(now: number = Date.now()): number {
    if (!this.eggState) return 0;
    if (this.eggState.hatched) return 1;

    const wallClockElapsed = now - this.eggState.obtainedTimestamp;

    // Interaction-based progress (0-1)
    const interactionProgress = Math.min(
      1,
      this.eggState.interactionProgress / this.thresholds.minInteractionProgress,
    );

    // Wall-clock progress (0-1): ramps from min to max time
    const clockRange = this.thresholds.maxWallClockMs - this.thresholds.minWallClockMs;
    const clockProgress =
      clockRange > 0
        ? Math.min(1, Math.max(0, (wallClockElapsed - this.thresholds.minWallClockMs) / clockRange))
        : wallClockElapsed >= this.thresholds.minWallClockMs
          ? 1
          : 0;

    // Combined: 70% interaction, 30% wall clock
    return Math.min(1, interactionProgress * 0.7 + clockProgress * 0.3);
  }

  /** Get the current visual stage for the egg. */
  getVisualStage(now: number = Date.now()): EggVisualStage {
    return getEggVisualStage(this.getHatchProgress(now));
  }

  /** Check if the egg meets hatching conditions. */
  isReadyToHatch(now: number = Date.now()): boolean {
    if (!this.eggState || this.eggState.hatched) return false;

    const wallClockElapsed = now - this.eggState.obtainedTimestamp;

    // Auto-hatch if max wall clock time exceeded
    if (wallClockElapsed >= this.thresholds.maxWallClockMs) {
      return true;
    }

    // Must meet both minimum wall clock AND interaction thresholds
    const hasEnoughTime = wallClockElapsed >= this.thresholds.minWallClockMs;
    const hasEnoughInteraction =
      this.eggState.interactionProgress >= this.thresholds.minInteractionProgress;

    return hasEnoughTime && hasEnoughInteraction;
  }

  /**
   * Hatch the egg and create the initial PetState in Blob stage.
   * Returns the new PetState or null if not ready.
   */
  hatch(petName: string, now: number = Date.now()): PetState | null {
    if (!this.eggState || this.eggState.hatched) return null;
    if (!this.isReadyToHatch(now)) return null;

    this.eggState.hatched = true;

    const pet: PetState = {
      name: petName,
      elementType: this.eggState.element,
      lifeStage: 'blob',
      stats: {
        hunger: 80,
        happiness: 90,
        energy: 100,
        hygiene: 100,
        health: 100,
        bond: Math.min(100, this.eggState.statAccumulator.bond),
        discipline: 50,
      },
      hiddenStats: {
        personality: [...this.eggState.personalityAccumulator],
        trust: Math.min(100, this.eggState.statAccumulator.trust),
        stress: 0,
      },
      illness: { type: null, startTimestamp: null },
      evolutionPath: null,
      birthTimestamp: now,
      stageStartTimestamp: now,
      careHistory: {
        happinessAvg: 50,
        disciplineRatio: 0.5,
        uniqueFoodsCount: 0,
        activitiesCompleted: 0,
        bondAvg: 50,
        secretFlags: {},
      },
      training: {
        sessionsToday: 0,
        lastSessionTimestamp: 0,
        fatigue: 0,
        skills: { obedience: 0, tricks: 0, agility: 0 },
      },
      hygieneCare: {
        dirtLevel: 0,
        bathPhase: 'idle',
        bathProgress: 0,
        groomed: false,
        lastBathTimestamp: 0,
      },
      sleep: {
        phase: 'awake',
        sleepStartTimestamp: 0,
        nightlightOn: false,
        dreamMood: null,
        wasForced: false,
      },
      mood: {
        moods: [],
        dominantMood: null,
      },
      communication: {
        lastBubbleTimestamp: 0,
        lastTalkTimestamp: 0,
        memory: [],
      },
    };

    this.emit('hatched', this.eggState);
    return pet;
  }

  /** Check whether a specific interaction is off cooldown. */
  isInteractionReady(type: EggInteractionType, now: number = Date.now()): boolean {
    if (!this.eggState || this.eggState.hatched) return false;
    const lastTime = this.eggState.lastInteractionTimestamps[type];
    const effect = EGG_INTERACTION_EFFECTS[type];
    return now - lastTime >= effect.cooldownMs;
  }

  /** Get remaining cooldown time in ms for an interaction type. */
  getCooldownRemaining(type: EggInteractionType, now: number = Date.now()): number {
    if (!this.eggState) return 0;
    const lastTime = this.eggState.lastInteractionTimestamps[type];
    const effect = EGG_INTERACTION_EFFECTS[type];
    return Math.max(0, effect.cooldownMs - (now - lastTime));
  }

  /** Subscribe to egg events. Returns unsubscribe function. */
  on(listener: EggEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit(type: EggEventType, state: EggState): void {
    for (const listener of this.listeners) {
      listener(type, state);
    }
  }
}
