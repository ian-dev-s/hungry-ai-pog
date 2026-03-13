/**
 * Configuration for the pet sleep system.
 * Sleep is synced to the player's local timezone.
 */

import { SleepPhase } from './SaveSchema';

/** Hour (0-23) when natural drowsiness begins. */
export const DROWSY_START_HOUR = 21;

/** Hour (0-23) when natural deep sleep happens. */
export const DEEP_SLEEP_HOUR = 23;

/** Hour (0-23) when pet naturally wakes up. */
export const WAKE_HOUR = 7;

/** Energy recovery rate during sleep (points per second). */
export const SLEEP_ENERGY_RECOVERY = 0.02;

/** Energy recovery rate during deep sleep (faster). */
export const DEEP_SLEEP_ENERGY_RECOVERY = 0.035;

/** Happiness recovery during sleep (points per second). */
export const SLEEP_HAPPINESS_RECOVERY = 0.005;

/** Stress reduction during sleep (points per second). */
export const SLEEP_STRESS_REDUCTION = 0.008;

/** Stat decay multiplier while sleeping (reduced). */
export const SLEEP_DECAY_MULTIPLIER = 0.2;

/** Stress increase when forcing a sleeping pet awake. */
export const FORCE_WAKE_STRESS = 15;

/** Happiness penalty when forcing a sleeping pet awake. */
export const FORCE_WAKE_HAPPINESS_PENALTY = -10;

/** Bond penalty when forcing awake. */
export const FORCE_WAKE_BOND_PENALTY = -5;

/** Minimum sleep duration (seconds) before pet can naturally wake. */
export const MIN_SLEEP_DURATION = 1800; // 30 minutes

/** Time in seconds for each sleep phase transition. */
export const PHASE_DURATIONS: Record<SleepPhase, number> = {
  awake: 0,
  drowsy: 300, // 5 minutes of drowsiness before light sleep
  light: 600, // 10 minutes light sleep before deep
  deep: 1800, // 30 minutes deep before potential dream
  dream: 600, // 10 minute dream cycles
};

/** Personality threshold for timidity (personality[0] < this = timid). */
export const TIMID_THRESHOLD = 0.3;

/** Stress reduction bonus from nightlight for timid pets. */
export const NIGHTLIGHT_STRESS_BONUS = 0.005;

/**
 * Dream mood icons based on emotional state.
 * Picked based on the pet's dominant emotion during sleep.
 */
export const DREAM_MOODS: Record<string, string> = {
  happy: 'heart',
  hungry: 'food',
  playful: 'star',
  anxious: 'cloud',
  neutral: 'zzz',
};

/**
 * Determine dream mood based on pet stats when entering dream phase.
 */
export function getDreamMood(stats: {
  hunger: number;
  happiness: number;
  energy: number;
  health: number;
}): string {
  if (stats.hunger < 30) return DREAM_MOODS.hungry;
  if (stats.happiness > 70) return DREAM_MOODS.happy;
  if (stats.happiness < 30) return DREAM_MOODS.anxious;
  if (stats.energy > 60) return DREAM_MOODS.playful;
  return DREAM_MOODS.neutral;
}
