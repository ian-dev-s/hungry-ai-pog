/**
 * Vocabulary System — manages expanding pet vocabulary tied to life stages.
 *
 * Pets start with simple expressions (blob stage) and gain more complex,
 * expressive vocabulary as they age. Each life stage unlocks new words/phrases
 * that accumulate with all previous stages' vocabulary.
 *
 * The system can filter vocabulary by bubble category and substitute
 * memory-based placeholders (e.g., favorite food/game names).
 */

import type { PetState } from '../data/SaveSchema';
import {
  type LifeStageVocab,
  type BubbleCategory,
  type VocabEntry,
  VOCABULARY_BY_STAGE,
  VOCAB_STAGE_ORDER,
} from '../data/PersonalityConfig';

export class VocabularySystem {
  /**
   * Get all vocabulary entries available at the pet's current life stage.
   * Accumulates words from all stages up to and including the current one.
   */
  getAvailableVocabulary(pet: PetState): VocabEntry[] {
    const stageIndex = VOCAB_STAGE_ORDER.indexOf(pet.lifeStage as LifeStageVocab);
    if (stageIndex < 0) return [];

    const entries: VocabEntry[] = [];
    for (let i = 0; i <= stageIndex; i++) {
      entries.push(...VOCABULARY_BY_STAGE[VOCAB_STAGE_ORDER[i]]);
    }
    return entries;
  }

  /**
   * Get vocabulary entries filtered by bubble category.
   */
  getVocabularyForCategory(pet: PetState, category: BubbleCategory): VocabEntry[] {
    return this.getAvailableVocabulary(pet).filter(
      (entry) => entry.categories.includes(category),
    );
  }

  /**
   * Get the total vocabulary size for the pet's current life stage.
   */
  getVocabularySize(pet: PetState): number {
    return this.getAvailableVocabulary(pet).length;
  }

  /**
   * Pick a random vocabulary text for a given category, with memory substitutions.
   * Returns null if no vocabulary matches.
   *
   * @param seed Optional random value (0-1) for deterministic testing.
   */
  pickText(
    pet: PetState,
    category: BubbleCategory,
    context?: { favoriteFood?: string; favoriteGame?: string },
    seed?: number,
  ): string | null {
    const entries = this.getVocabularyForCategory(pet, category);
    if (entries.length === 0) return null;

    const roll = seed ?? Math.random();
    const index = Math.floor(roll * entries.length) % entries.length;
    let text = entries[index].text;

    // Substitute memory-based placeholders
    if (context?.favoriteFood) {
      text = text.replace('{food}', context.favoriteFood);
    }
    if (context?.favoriteGame) {
      text = text.replace('{game}', context.favoriteGame);
    }

    return text;
  }

  /**
   * Check if the pet has unlocked vocabulary for a specific category.
   */
  hasVocabularyFor(pet: PetState, category: BubbleCategory): boolean {
    return this.getVocabularyForCategory(pet, category).length > 0;
  }
}
