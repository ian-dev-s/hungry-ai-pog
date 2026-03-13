/**
 * Personality System — behavioral quirks, affection expressions, and rebellion.
 *
 * Uses the 4-dimensional personality vector [playful, brave, gentle, smart]
 * to determine which quirks are active. Quirks modify game behavior:
 * - Mischievous pets hide items and play pranks
 * - Timid pets hide during storms and need comfort
 * - Brave pets get better exploration loot
 * - Scholars learn training faster
 * - Gluttons ask for food more often
 * - Social pets initiate communication more
 *
 * Rebellion occurs during the adolescent life stage.
 * Affection expressions happen for high-bond, high-trust pets.
 */

import type { PetState } from '../data/SaveSchema';
import {
  type QuirkType,
  type MoodType,
  QUIRK_DEFINITIONS,
  REBELLION_STAGE,
  REBELLION_BASE_CHANCE,
  DISCIPLINE_REBELLION_FACTOR,
  AFFECTION_BOND_THRESHOLD,
  AFFECTION_TRUST_THRESHOLD,
  AFFECTION_EXPRESSION_CHANCE,
  REBELLION_BUBBLES,
  AFFECTION_BUBBLES,
  type SpeechBubble,
} from '../data/PersonalityConfig';

export interface QuirkCheckResult {
  quirk: QuirkType;
  active: boolean;
  description: string;
}

export interface RebellionResult {
  rebelled: boolean;
  bubble: SpeechBubble | null;
}

export interface AffectionResult {
  expressed: boolean;
  bubble: SpeechBubble | null;
}

export class PersonalitySystem {
  /**
   * Get all quirks and whether they are active for this pet.
   */
  getQuirks(pet: PetState): QuirkCheckResult[] {
    const personality = pet.hiddenStats.personality;
    const results: QuirkCheckResult[] = [];

    for (const [quirkType, def] of Object.entries(QUIRK_DEFINITIONS)) {
      const value = personality[def.personalityIndex];
      let active = false;

      if (def.highThreshold !== undefined && value >= def.highThreshold) {
        active = true;
      }
      if (def.lowThreshold !== undefined && value <= def.lowThreshold) {
        active = true;
      }

      results.push({
        quirk: quirkType as QuirkType,
        active,
        description: def.description,
      });
    }

    return results;
  }

  /**
   * Get only the active quirks for this pet.
   */
  getActiveQuirks(pet: PetState): QuirkType[] {
    return this.getQuirks(pet)
      .filter((q) => q.active)
      .map((q) => q.quirk);
  }

  /**
   * Check if a specific quirk is active.
   */
  hasQuirk(pet: PetState, quirk: QuirkType): boolean {
    const def = QUIRK_DEFINITIONS[quirk];
    const value = pet.hiddenStats.personality[def.personalityIndex];

    if (def.highThreshold !== undefined && value >= def.highThreshold) return true;
    if (def.lowThreshold !== undefined && value <= def.lowThreshold) return true;
    return false;
  }

  /**
   * Check if the pet is in its rebellion phase (adolescent stage).
   */
  isInRebellionPhase(pet: PetState): boolean {
    return pet.lifeStage === REBELLION_STAGE;
  }

  /**
   * Roll for rebellion when the pet is asked to do something.
   * Higher discipline reduces rebellion chance.
   * Returns whether the pet rebels and an optional speech bubble.
   *
   * @param seed Optional random value (0-1) for deterministic testing.
   */
  checkRebellion(pet: PetState, seed?: number): RebellionResult {
    if (!this.isInRebellionPhase(pet)) {
      return { rebelled: false, bubble: null };
    }

    const discipline = pet.stats.discipline;
    const rebellionChance =
      REBELLION_BASE_CHANCE * (1 - (discipline / 100) * DISCIPLINE_REBELLION_FACTOR);

    const roll = seed ?? Math.random();
    if (roll < rebellionChance) {
      const bubble = REBELLION_BUBBLES[Math.floor(roll * 1000) % REBELLION_BUBBLES.length];
      return { rebelled: true, bubble };
    }

    return { rebelled: false, bubble: null };
  }

  /**
   * Get the rebellion chance for the current pet state (for UI display).
   */
  getRebellionChance(pet: PetState): number {
    if (!this.isInRebellionPhase(pet)) return 0;

    const discipline = pet.stats.discipline;
    return REBELLION_BASE_CHANCE * (1 - (discipline / 100) * DISCIPLINE_REBELLION_FACTOR);
  }

  /**
   * Check if the pet wants to express affection.
   * Requires high bond AND high trust.
   *
   * @param seed Optional random value (0-1) for deterministic testing.
   */
  checkAffection(pet: PetState, seed?: number): AffectionResult {
    if (
      pet.stats.bond < AFFECTION_BOND_THRESHOLD ||
      pet.hiddenStats.trust < AFFECTION_TRUST_THRESHOLD
    ) {
      return { expressed: false, bubble: null };
    }

    const roll = seed ?? Math.random();
    if (roll < AFFECTION_EXPRESSION_CHANCE) {
      const bubble = AFFECTION_BUBBLES[Math.floor(roll * 1000) % AFFECTION_BUBBLES.length];
      return { expressed: true, bubble };
    }

    return { expressed: false, bubble: null };
  }

  /**
   * Get the training speed multiplier based on personality quirks.
   * Scholar quirk gives a bonus.
   */
  getTrainingMultiplier(pet: PetState): number {
    return this.hasQuirk(pet, 'scholar') ? 1.25 : 1.0;
  }

  /**
   * Get the exploration loot multiplier based on personality quirks.
   * Brave quirk gives a bonus.
   */
  getExplorationLootMultiplier(pet: PetState): number {
    return this.hasQuirk(pet, 'brave') ? 1.3 : 1.0;
  }

  /**
   * Check if the mischievous pet hides an item (random chance per interaction).
   *
   * @param seed Optional random value (0-1) for deterministic testing.
   */
  checkMischief(pet: PetState, seed?: number): boolean {
    if (!this.hasQuirk(pet, 'mischievous')) return false;
    const roll = seed ?? Math.random();
    return roll < 0.15; // 15% chance to play a prank
  }

  /**
   * Check if the timid pet is frightened by current weather.
   */
  isScaredByWeather(pet: PetState, weatherType: string): boolean {
    if (!this.hasQuirk(pet, 'timid')) return false;
    return weatherType === 'stormy';
  }

  /**
   * Get the communication frequency multiplier.
   * Social pets communicate more often.
   */
  getCommunicationFrequencyMultiplier(pet: PetState): number {
    return this.hasQuirk(pet, 'social') ? 0.6 : 1.0; // Lower = more frequent
  }

  /**
   * Get the bond decay multiplier.
   * Social pets lose bond slower.
   */
  getBondDecayMultiplier(pet: PetState): number {
    return this.hasQuirk(pet, 'social') ? 0.7 : 1.0;
  }

  /**
   * Get the fullness decay multiplier.
   * Glutton pets get hungry faster.
   */
  getFullnessDecayMultiplier(pet: PetState): number {
    return this.hasQuirk(pet, 'glutton') ? 1.3 : 1.0;
  }
}
