/**
 * Feeding system — handles food preference calculation, feeding logic,
 * overfeeding/underfeeding detection, and meal history tracking.
 */

import type { PetState, InventoryItem, SaveData } from '../data/SaveSchema';
import type { FoodItem, StatEffect } from '../data/FoodDatabase';
import { getFoodById } from '../data/FoodDatabase';
import { getRecipeById, type Recipe } from '../data/RecipeDatabase';
import { StatsEngine } from './StatsEngine';

/** Maximum fullness before overfeeding triggers sickness. */
export const OVERFEED_THRESHOLD = 100;

/** Fullness decays at this rate per second. */
export const FULLNESS_DECAY_RATE = 0.02;

/** Number of recent meals tracked for preference learning. */
const MEAL_HISTORY_SIZE = 20;

/** How long (ms) without feeding before underfeeding weakens the pet. */
export const UNDERFEED_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

export type FeedingReaction =
  | 'loved'
  | 'liked'
  | 'neutral'
  | 'disliked'
  | 'overfed';

export interface FeedingResult {
  reaction: FeedingReaction;
  appliedEffects: StatEffect[];
  fullnessAfter: number;
  preferenceDelta: number;
}

export interface MealHistoryEntry {
  foodId: string;
  timestamp: number;
  reaction: FeedingReaction;
}

export interface FeedingState {
  fullness: number;
  mealHistory: MealHistoryEntry[];
  lastFedTimestamp: number;
}

export function createDefaultFeedingState(): FeedingState {
  return {
    fullness: 50,
    mealHistory: [],
    lastFedTimestamp: Date.now(),
  };
}

export class FeedingSystem {
  private statsEngine: StatsEngine;

  constructor(statsEngine: StatsEngine) {
    this.statsEngine = statsEngine;
  }

  /**
   * Calculate how much a pet likes a food based on personality vector affinity.
   * Returns a score from -1 (hates) to 1 (loves).
   */
  calculatePreference(pet: PetState, food: FoodItem): number {
    const personality = pet.hiddenStats.personality;
    const affinity = food.personalityAffinity;
    // Dot product of personality and food affinity vectors
    let score = 0;
    for (let i = 0; i < 4; i++) {
      score += personality[i] * affinity[i];
    }
    // Normalize to -1..1 range (max dot product of two unit-ish vectors)
    return Math.max(-1, Math.min(1, score));
  }

  /**
   * Determine the reaction based on preference score.
   */
  getReactionFromPreference(score: number): FeedingReaction {
    if (score > 0.5) return 'loved';
    if (score > 0.15) return 'liked';
    if (score > -0.15) return 'neutral';
    return 'disliked';
  }

  /**
   * Feed a single food item to the pet.
   * Returns null if the food is not in inventory.
   */
  feedFood(
    pet: PetState,
    foodId: string,
    feedingState: FeedingState,
    inventory: InventoryItem[],
  ): FeedingResult | null {
    const food = getFoodById(foodId);
    if (!food) return null;

    // Check inventory
    const invItem = inventory.find((i) => i.id === foodId);
    if (!invItem || invItem.quantity <= 0) return null;

    // Check overfeeding
    if (feedingState.fullness + food.fillAmount > OVERFEED_THRESHOLD) {
      // Apply overfeeding penalty
      this.statsEngine.modifyStat(pet, 'health', -10);
      this.statsEngine.modifyHiddenStat(pet, 'stress', 10);
      feedingState.fullness = Math.min(
        feedingState.fullness + food.fillAmount,
        OVERFEED_THRESHOLD + 20,
      );

      this.recordMeal(feedingState, foodId, 'overfed');
      invItem.quantity -= 1;

      return {
        reaction: 'overfed',
        appliedEffects: [
          { stat: 'health', value: -10 },
        ],
        fullnessAfter: feedingState.fullness,
        preferenceDelta: 0,
      };
    }

    // Calculate preference
    const preference = this.calculatePreference(pet, food);
    const reaction = this.getReactionFromPreference(preference);

    // Apply stat effects with preference modifier
    const effectMultiplier = this.getEffectMultiplier(reaction);
    const appliedEffects: StatEffect[] = [];

    for (const effect of food.effects) {
      const modified = Math.round(effect.value * effectMultiplier);
      this.statsEngine.modifyStat(pet, effect.stat, modified);
      appliedEffects.push({ stat: effect.stat, value: modified });
    }

    // Bonus bond for loved foods
    if (reaction === 'loved') {
      this.statsEngine.modifyStat(pet, 'bond', 3);
      appliedEffects.push({ stat: 'bond', value: 3 });
    }

    // Penalty for disliked foods
    if (reaction === 'disliked') {
      this.statsEngine.modifyStat(pet, 'happiness', -5);
      appliedEffects.push({ stat: 'happiness', value: -5 });
    }

    // Update fullness and history
    feedingState.fullness += food.fillAmount;
    feedingState.lastFedTimestamp = Date.now();
    this.recordMeal(feedingState, foodId, reaction);

    // Consume from inventory
    invItem.quantity -= 1;

    return {
      reaction,
      appliedEffects,
      fullnessAfter: feedingState.fullness,
      preferenceDelta: preference,
    };
  }

  /**
   * Cook and feed a recipe to the pet.
   * Consumes all ingredient items from inventory.
   */
  feedRecipe(
    pet: PetState,
    recipeId: string,
    feedingState: FeedingState,
    inventory: InventoryItem[],
    coins: number,
  ): { result: FeedingResult; coinsSpent: number } | null {
    const recipe = getRecipeById(recipeId);
    if (!recipe) return null;

    // Check craft cost
    if (coins < recipe.craftCost) return null;

    // Check all ingredients are available
    for (const ingId of recipe.ingredients) {
      const invItem = inventory.find((i) => i.id === ingId);
      if (!invItem || invItem.quantity <= 0) return null;
    }

    // Check overfeeding
    if (feedingState.fullness + recipe.fillAmount > OVERFEED_THRESHOLD) {
      this.statsEngine.modifyStat(pet, 'health', -10);
      this.statsEngine.modifyHiddenStat(pet, 'stress', 10);
      feedingState.fullness = Math.min(
        feedingState.fullness + recipe.fillAmount,
        OVERFEED_THRESHOLD + 20,
      );

      // Still consume ingredients
      for (const ingId of recipe.ingredients) {
        const invItem = inventory.find((i) => i.id === ingId)!;
        invItem.quantity -= 1;
      }
      this.recordMeal(feedingState, recipeId, 'overfed');

      return {
        result: {
          reaction: 'overfed',
          appliedEffects: [{ stat: 'health', value: -10 }],
          fullnessAfter: feedingState.fullness,
          preferenceDelta: 0,
        },
        coinsSpent: recipe.craftCost,
      };
    }

    // Calculate average preference across ingredients
    let totalPref = 0;
    let ingredientCount = 0;
    for (const ingId of recipe.ingredients) {
      const food = getFoodById(ingId);
      if (food) {
        totalPref += this.calculatePreference(pet, food);
        ingredientCount++;
      }
    }
    const avgPreference = ingredientCount > 0 ? totalPref / ingredientCount : 0;
    // Recipes get a preference boost since the pet appreciates the effort
    const boostedPreference = Math.min(1, avgPreference + 0.2);
    const reaction = this.getReactionFromPreference(boostedPreference);

    const effectMultiplier = this.getEffectMultiplier(reaction);
    const appliedEffects: StatEffect[] = [];

    // Apply ingredient effects
    for (const ingId of recipe.ingredients) {
      const food = getFoodById(ingId);
      if (food) {
        for (const effect of food.effects) {
          const modified = Math.round(effect.value * effectMultiplier);
          this.statsEngine.modifyStat(pet, effect.stat, modified);
          appliedEffects.push({ stat: effect.stat, value: modified });
        }
      }
    }

    // Apply bonus effects
    for (const effect of recipe.bonusEffects) {
      const modified = Math.round(effect.value * effectMultiplier);
      this.statsEngine.modifyStat(pet, effect.stat, modified);
      appliedEffects.push({ stat: effect.stat, value: modified });
    }

    // Recipe always gives a bond boost
    this.statsEngine.modifyStat(pet, 'bond', 5);
    appliedEffects.push({ stat: 'bond', value: 5 });

    // Update fullness and history
    feedingState.fullness += recipe.fillAmount;
    feedingState.lastFedTimestamp = Date.now();
    this.recordMeal(feedingState, recipeId, reaction);

    // Consume ingredients
    for (const ingId of recipe.ingredients) {
      const invItem = inventory.find((i) => i.id === ingId)!;
      invItem.quantity -= 1;
    }

    return {
      result: {
        reaction,
        appliedEffects,
        fullnessAfter: feedingState.fullness,
        preferenceDelta: boostedPreference,
      },
      coinsSpent: recipe.craftCost,
    };
  }

  /**
   * Tick fullness decay over time.
   */
  tickFullness(feedingState: FeedingState, dt: number): void {
    feedingState.fullness = Math.max(
      0,
      feedingState.fullness - FULLNESS_DECAY_RATE * dt,
    );
  }

  /**
   * Check if pet is underfed (hasn't been fed for too long).
   */
  isUnderfed(feedingState: FeedingState): boolean {
    return Date.now() - feedingState.lastFedTimestamp > UNDERFEED_WINDOW_MS;
  }

  /**
   * Apply underfeeding penalties when detected.
   */
  applyUnderfeedingPenalty(pet: PetState): void {
    this.statsEngine.modifyStat(pet, 'health', -5);
    this.statsEngine.modifyStat(pet, 'energy', -10);
    this.statsEngine.modifyHiddenStat(pet, 'stress', 5);
  }

  /**
   * Get the pet's most liked foods based on meal history.
   */
  getFavoriteFoods(feedingState: FeedingState): string[] {
    const counts = new Map<string, number>();
    for (const meal of feedingState.mealHistory) {
      if (meal.reaction === 'loved' || meal.reaction === 'liked') {
        counts.set(meal.foodId, (counts.get(meal.foodId) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);
  }

  /**
   * Get the pet's most disliked foods based on meal history.
   */
  getDislikedFoods(feedingState: FeedingState): string[] {
    const counts = new Map<string, number>();
    for (const meal of feedingState.mealHistory) {
      if (meal.reaction === 'disliked') {
        counts.set(meal.foodId, (counts.get(meal.foodId) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);
  }

  /**
   * Check if player can afford and has ingredients for a recipe.
   */
  canCraftRecipe(
    recipe: Recipe,
    inventory: InventoryItem[],
    coins: number,
  ): boolean {
    if (coins < recipe.craftCost) return false;
    return recipe.ingredients.every((ingId) => {
      const item = inventory.find((i) => i.id === ingId);
      return item && item.quantity > 0;
    });
  }

  private getEffectMultiplier(reaction: FeedingReaction): number {
    switch (reaction) {
      case 'loved':
        return 1.3;
      case 'liked':
        return 1.1;
      case 'neutral':
        return 1.0;
      case 'disliked':
        return 0.7;
      case 'overfed':
        return 0.5;
    }
  }

  private recordMeal(
    feedingState: FeedingState,
    foodId: string,
    reaction: FeedingReaction,
  ): void {
    feedingState.mealHistory.push({
      foodId,
      timestamp: Date.now(),
      reaction,
    });
    // Trim to keep only recent meals
    if (feedingState.mealHistory.length > MEAL_HISTORY_SIZE) {
      feedingState.mealHistory = feedingState.mealHistory.slice(
        -MEAL_HISTORY_SIZE,
      );
    }
  }
}
