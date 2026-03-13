/**
 * Communication System — speech bubbles, pet-initiated messages, and talk interaction.
 *
 * Pets communicate through speech bubbles with icons/emojis. Bubbles can be:
 * - Need-based: triggered by low stats (hungry, tired, dirty, sick)
 * - Feeling-based: reflecting current mood state
 * - Request-based: asking for favorite foods/games from memory
 * - Affection: expressing love for high-bond pets
 * - Rebellion: defiant expressions during adolescence
 *
 * Players can talk to their pet to boost bond, happiness, and reduce stress.
 * Pets initiate communication over time based on their needs and personality.
 */

import type { PetState } from '../data/SaveSchema';
import {
  type MoodType,
  type SpeechBubble,
  type BubbleCategory,
  NEED_BUBBLES,
  FEELING_BUBBLES,
  REQUEST_BUBBLES,
  MIN_COMMUNICATION_INTERVAL,
  TALK_BOND_BOOST,
  TALK_HAPPINESS_BOOST,
  TALK_STRESS_REDUCTION,
  TALK_COOLDOWN,
} from '../data/PersonalityConfig';
import { MoodEngine } from './MoodEngine';
import { PersonalitySystem } from './PersonalitySystem';
import { VocabularySystem } from './VocabularySystem';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface TalkResult {
  success: boolean;
  reason?: string;
  bondDelta: number;
  happinessDelta: number;
  stressDelta: number;
}

export class CommunicationSystem {
  private moodEngine: MoodEngine;
  private personalitySystem: PersonalitySystem;
  private vocabularySystem: VocabularySystem;

  constructor(moodEngine: MoodEngine, personalitySystem: PersonalitySystem, vocabularySystem?: VocabularySystem) {
    this.moodEngine = moodEngine;
    this.personalitySystem = personalitySystem;
    this.vocabularySystem = vocabularySystem ?? new VocabularySystem();
  }

  /**
   * Player talks to pet. Boosts bond, happiness, reduces stress.
   * Has a cooldown to prevent spamming.
   */
  talkToPet(pet: PetState, now: number): TalkResult {
    const elapsed = (now - pet.communication.lastTalkTimestamp) / 1000;
    if (elapsed < TALK_COOLDOWN) {
      return {
        success: false,
        reason: 'Pet was just talked to recently',
        bondDelta: 0,
        happinessDelta: 0,
        stressDelta: 0,
      };
    }

    // Apply boosts
    pet.stats.bond = clamp(pet.stats.bond + TALK_BOND_BOOST, 0, 100);
    pet.stats.happiness = clamp(pet.stats.happiness + TALK_HAPPINESS_BOOST, 0, 100);
    pet.hiddenStats.stress = clamp(pet.hiddenStats.stress - TALK_STRESS_REDUCTION, 0, 100);

    pet.communication.lastTalkTimestamp = now;

    // Record as event for mood system
    this.moodEngine.recordEvent(pet, 'talked_to');

    return {
      success: true,
      bondDelta: TALK_BOND_BOOST,
      happinessDelta: TALK_HAPPINESS_BOOST,
      stressDelta: -TALK_STRESS_REDUCTION,
    };
  }

  /**
   * Check if the pet wants to initiate communication.
   * Returns a speech bubble if the pet has something to say, null otherwise.
   */
  checkForBubble(pet: PetState, now: number): SpeechBubble | null {
    const freqMultiplier = this.personalitySystem.getCommunicationFrequencyMultiplier(pet);
    const interval = MIN_COMMUNICATION_INTERVAL * freqMultiplier;
    const elapsed = (now - pet.communication.lastBubbleTimestamp) / 1000;

    if (elapsed < interval) return null;

    // Gather all candidate bubbles
    const candidates = this.gatherCandidateBubbles(pet);
    if (candidates.length === 0) return null;

    // Pick highest priority bubble
    candidates.sort((a, b) => b.priority - a.priority);
    const bubble = candidates[0];

    pet.communication.lastBubbleTimestamp = now;
    return bubble;
  }

  /**
   * Get all possible speech bubbles the pet might show right now.
   * Useful for UI to display multiple indicators.
   */
  getCandidateBubbles(pet: PetState): SpeechBubble[] {
    return this.gatherCandidateBubbles(pet);
  }

  /**
   * Check if the player can talk to the pet (cooldown check).
   */
  canTalk(pet: PetState, now: number): boolean {
    const elapsed = (now - pet.communication.lastTalkTimestamp) / 1000;
    return elapsed >= TALK_COOLDOWN;
  }

  /**
   * Get the remaining cooldown time for talking (seconds).
   */
  getTalkCooldownRemaining(pet: PetState, now: number): number {
    const elapsed = (now - pet.communication.lastTalkTimestamp) / 1000;
    return Math.max(0, TALK_COOLDOWN - elapsed);
  }

  /**
   * Get the vocabulary system instance (for external access/testing).
   */
  getVocabularySystem(): VocabularySystem {
    return this.vocabularySystem;
  }

  private gatherCandidateBubbles(pet: PetState): SpeechBubble[] {
    const bubbles: SpeechBubble[] = [];

    // Need-based bubbles
    if (pet.stats.hunger < 25) bubbles.push(this.enrichBubble(pet, NEED_BUBBLES.hungry));
    if (pet.stats.energy < 20) bubbles.push(this.enrichBubble(pet, NEED_BUBBLES.tired));
    if (pet.stats.hygiene < 20) bubbles.push(this.enrichBubble(pet, NEED_BUBBLES.dirty));
    if (pet.illness.type !== null) bubbles.push(this.enrichBubble(pet, NEED_BUBBLES.sick));
    if (pet.stats.bond < 25) bubbles.push(this.enrichBubble(pet, NEED_BUBBLES.lonely));
    if (pet.hiddenStats.stress > 70) bubbles.push(this.enrichBubble(pet, NEED_BUBBLES.stressed));

    // Feeling-based bubbles from mood
    const activeMoods = this.moodEngine.getActiveMoods(pet);
    for (const { mood } of activeMoods) {
      const bubble = FEELING_BUBBLES[mood];
      if (bubble) bubbles.push(this.enrichBubble(pet, bubble));
    }

    // Request bubbles from memory
    const requestBubbles = this.getMemoryBasedRequests(pet);
    bubbles.push(...requestBubbles);

    // Affection check
    const affection = this.personalitySystem.checkAffection(pet);
    if (affection.expressed && affection.bubble) {
      bubbles.push(this.enrichBubble(pet, affection.bubble));
    }

    return bubbles;
  }

  /**
   * Enrich a speech bubble with vocabulary-appropriate text when available.
   * Falls back to the original bubble text if no vocabulary matches.
   */
  private enrichBubble(pet: PetState, bubble: SpeechBubble): SpeechBubble {
    const vocabText = this.vocabularySystem.pickText(pet, bubble.category, this.getMemoryContext(pet));
    if (vocabText) {
      return { ...bubble, text: vocabText };
    }
    return bubble;
  }

  private getMemoryContext(pet: PetState): { favoriteFood?: string; favoriteGame?: string } {
    const memory = pet.communication.memory;
    const context: { favoriteFood?: string; favoriteGame?: string } = {};

    const foodCounts = new Map<string, number>();
    const gameCounts = new Map<string, number>();

    for (const event of memory) {
      if (event.type === 'fed_loved' && event.details) {
        foodCounts.set(event.details, (foodCounts.get(event.details) ?? 0) + 1);
      }
      if (event.type === 'played_game' && event.details) {
        gameCounts.set(event.details, (gameCounts.get(event.details) ?? 0) + 1);
      }
    }

    if (foodCounts.size > 0) {
      context.favoriteFood = [...foodCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }
    if (gameCounts.size > 0) {
      context.favoriteGame = [...gameCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }

    return context;
  }

  private getMemoryBasedRequests(pet: PetState): SpeechBubble[] {
    const requests: SpeechBubble[] = [];
    const memory = pet.communication.memory;

    // Find favorite foods from memory (most fed_loved events)
    const foodCounts = new Map<string, number>();
    for (const event of memory) {
      if (event.type === 'fed_loved' && event.details) {
        foodCounts.set(event.details, (foodCounts.get(event.details) ?? 0) + 1);
      }
    }

    if (foodCounts.size > 0) {
      const favoriteFood = [...foodCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      if (pet.stats.hunger < 50) {
        requests.push({
          ...REQUEST_BUBBLES.favorite_food,
          text: REQUEST_BUBBLES.favorite_food.text.replace('{food}', favoriteFood),
        });
      }
    }

    // Find favorite games from memory
    const gameCounts = new Map<string, number>();
    for (const event of memory) {
      if (event.type === 'played_game' && event.details) {
        gameCounts.set(event.details, (gameCounts.get(event.details) ?? 0) + 1);
      }
    }

    if (gameCounts.size > 0) {
      const favoriteGame = [...gameCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const boredom = this.moodEngine.getMoodIntensity(pet, 'bored');
      if (boredom > 10) {
        requests.push({
          ...REQUEST_BUBBLES.favorite_game,
          text: REQUEST_BUBBLES.favorite_game.text.replace('{game}', favoriteGame),
        });
      }
    }

    return requests;
  }
}
