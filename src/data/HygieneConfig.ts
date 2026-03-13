/**
 * Configuration for the pet hygiene / bathing system.
 */

import { BathPhase, WaterTemperature } from './SaveSchema';
import { LifeStage } from './StatsConfig';

/** Rate at which dirt accumulates (points per second). */
export const DIRT_ACCUMULATION_RATE = 0.003;

/** Dirt level at which visible dirt appears on the pet sprite. */
export const VISIBLE_DIRT_THRESHOLD = 40;

/** Dirt level at which hygiene stat starts draining faster. */
export const HEAVY_DIRT_THRESHOLD = 70;

/** Extra hygiene decay rate when heavily dirty (per second). */
export const HEAVY_DIRT_HYGIENE_DRAIN = 0.008;

/** Progress required to complete each bath phase (0-100). */
export const PHASE_COMPLETION = 100;

/** Progress gained per interaction tap/click during a bath phase. */
export const PROGRESS_PER_INTERACTION = 20;

/** Ordered bath phases (idle is not part of the flow). */
export const BATH_PHASE_ORDER: BathPhase[] = ['scrub', 'rinse', 'dry'];

/** Hygiene stat restored after completing a full bath. */
export const BATH_HYGIENE_RESTORE = 50;

/** Dirt reduction after completing a full bath. */
export const BATH_DIRT_REDUCTION = 80;

/** Happiness bonus/penalty for water temperature preference match. */
export const TEMP_PREFERENCE_BONUS = 5;
export const TEMP_PREFERENCE_PENALTY = -5;

/**
 * Preferred water temperature based on personality vector.
 * personality[1] (boldness): low = prefers warm, high = prefers cold.
 * Fire element pets always prefer hot.
 * Aquatic element pets always prefer warm.
 */
export function getPreferredTemperature(
  personality: [number, number, number, number],
  elementType: string,
): WaterTemperature {
  if (elementType === 'fire') return 'hot';
  if (elementType === 'aquatic') return 'warm';

  const boldness = personality[1];
  if (boldness > 0.7) return 'cold';
  if (boldness < 0.3) return 'hot';
  return 'warm';
}

/** Life stages that support grooming (in addition to bathing). */
export const GROOMABLE_STAGES: LifeStage[] = [
  'juvenile',
  'adolescent',
  'adult',
  'elder',
];

/** Hygiene bonus from grooming. */
export const GROOMING_HYGIENE_BONUS = 15;

/** Happiness bonus from grooming. */
export const GROOMING_HAPPINESS_BONUS = 5;

/** Bond bonus from grooming. */
export const GROOMING_BOND_BONUS = 3;
