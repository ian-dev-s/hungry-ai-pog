import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeedingSystem, createDefaultFeedingState, OVERFEED_THRESHOLD, FULLNESS_DECAY_RATE } from '../FeedingSystem';
import { StatsEngine } from '../StatsEngine';
import type { PetState, InventoryItem } from '../../data/SaveSchema';
import type { FeedingState } from '../FeedingSystem';

function createTestPet(overrides: Partial<PetState> = {}): PetState {
  return {
    name: 'TestPet',
    elementType: 'forest',
    lifeStage: 'juvenile',
    stats: {
      hunger: 50,
      happiness: 50,
      energy: 50,
      hygiene: 50,
      health: 50,
      bond: 50,
      discipline: 50,
    },
    hiddenStats: {
      personality: [0.5, 0.3, 0.2, 0.4],
      trust: 50,
      stress: 30,
    },
    evolutionPath: null,
    birthTimestamp: Date.now() - 86400000,
    stageStartTimestamp: Date.now() - 43200000,
    ...overrides,
  };
}

function createInventory(...items: { id: string; qty: number }[]): InventoryItem[] {
  return items.map((i) => ({ id: i.id, type: 'food', quantity: i.qty }));
}

describe('FeedingSystem', () => {
  let statsEngine: StatsEngine;
  let feedingSystem: FeedingSystem;
  let pet: PetState;
  let feedingState: FeedingState;

  beforeEach(() => {
    statsEngine = new StatsEngine();
    feedingSystem = new FeedingSystem(statsEngine);
    pet = createTestPet();
    feedingState = createDefaultFeedingState();
    feedingState.fullness = 30;
  });

  describe('calculatePreference', () => {
    it('should return a score between -1 and 1', () => {
      const { getFoodById } = require('../../data/FoodDatabase');
      const apple = getFoodById('apple')!;
      const score = feedingSystem.calculatePreference(pet, apple);
      expect(score).toBeGreaterThanOrEqual(-1);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should reflect personality alignment', () => {
      const { getFoodById } = require('../../data/FoodDatabase');
      // Playful pet should prefer playful foods
      const playfulPet = createTestPet({
        hiddenStats: { personality: [1, 0, 0, 0], trust: 50, stress: 30 },
      });
      const candy = getFoodById('candy')!; // high playful affinity
      const leafyGreens = getFoodById('leafy_greens')!; // negative playful affinity

      const candyScore = feedingSystem.calculatePreference(playfulPet, candy);
      const greensScore = feedingSystem.calculatePreference(playfulPet, leafyGreens);

      expect(candyScore).toBeGreaterThan(greensScore);
    });
  });

  describe('getReactionFromPreference', () => {
    it('should return loved for high scores', () => {
      expect(feedingSystem.getReactionFromPreference(0.7)).toBe('loved');
    });

    it('should return liked for moderate scores', () => {
      expect(feedingSystem.getReactionFromPreference(0.3)).toBe('liked');
    });

    it('should return neutral for near-zero scores', () => {
      expect(feedingSystem.getReactionFromPreference(0.05)).toBe('neutral');
    });

    it('should return disliked for negative scores', () => {
      expect(feedingSystem.getReactionFromPreference(-0.5)).toBe('disliked');
    });
  });

  describe('feedFood', () => {
    it('should apply food effects and consume from inventory', () => {
      const inventory = createInventory({ id: 'apple', qty: 3 });
      const result = feedingSystem.feedFood(pet, 'apple', feedingState, inventory);

      expect(result).not.toBeNull();
      expect(result!.reaction).toBeDefined();
      expect(result!.appliedEffects.length).toBeGreaterThan(0);
      expect(inventory[0].quantity).toBe(2);
      expect(feedingState.fullness).toBeGreaterThan(30);
    });

    it('should return null for food not in inventory', () => {
      const inventory = createInventory();
      const result = feedingSystem.feedFood(pet, 'apple', feedingState, inventory);
      expect(result).toBeNull();
    });

    it('should return null for unknown food id', () => {
      const inventory = createInventory({ id: 'unknown', qty: 1 });
      const result = feedingSystem.feedFood(pet, 'unknown', feedingState, inventory);
      expect(result).toBeNull();
    });

    it('should trigger overfeeding when fullness exceeds threshold', () => {
      feedingState.fullness = 95;
      const inventory = createInventory({ id: 'steak', qty: 1 });
      const result = feedingSystem.feedFood(pet, 'steak', feedingState, inventory);

      expect(result).not.toBeNull();
      expect(result!.reaction).toBe('overfed');
      expect(pet.stats.health).toBeLessThan(50);
    });

    it('should give bond bonus for loved foods', () => {
      // Create a pet that will love berries (high playful personality)
      const playfulPet = createTestPet({
        hiddenStats: { personality: [1, 0, 0.5, 0], trust: 50, stress: 30 },
      });
      const inventory = createInventory({ id: 'berries', qty: 1 });
      const result = feedingSystem.feedFood(playfulPet, 'berries', feedingState, inventory);

      if (result && result.reaction === 'loved') {
        const bondEffect = result.appliedEffects.find((e) => e.stat === 'bond');
        expect(bondEffect).toBeDefined();
      }
    });

    it('should record meal in history', () => {
      const inventory = createInventory({ id: 'apple', qty: 1 });
      feedingSystem.feedFood(pet, 'apple', feedingState, inventory);

      expect(feedingState.mealHistory.length).toBe(1);
      expect(feedingState.mealHistory[0].foodId).toBe('apple');
    });

    it('should not feed when inventory quantity is 0', () => {
      const inventory = createInventory({ id: 'apple', qty: 0 });
      const result = feedingSystem.feedFood(pet, 'apple', feedingState, inventory);
      expect(result).toBeNull();
    });
  });

  describe('feedRecipe', () => {
    it('should consume all ingredients and apply bonus effects', () => {
      const inventory = createInventory(
        { id: 'apple', qty: 1 },
        { id: 'berries', qty: 1 },
        { id: 'honey', qty: 1 },
      );
      const result = feedingSystem.feedRecipe(
        pet,
        'fruit_salad',
        feedingState,
        inventory,
        100,
      );

      expect(result).not.toBeNull();
      expect(result!.result.reaction).toBeDefined();
      expect(inventory[0].quantity).toBe(0); // apple consumed
      expect(inventory[1].quantity).toBe(0); // berries consumed
      expect(inventory[2].quantity).toBe(0); // honey consumed
    });

    it('should return null if missing ingredients', () => {
      const inventory = createInventory({ id: 'apple', qty: 1 });
      const result = feedingSystem.feedRecipe(
        pet,
        'fruit_salad',
        feedingState,
        inventory,
        100,
      );
      expect(result).toBeNull();
    });

    it('should return null if not enough coins for craft cost', () => {
      const inventory = createInventory(
        { id: 'carrot', qty: 1 },
        { id: 'pumpkin', qty: 1 },
        { id: 'mushroom', qty: 1 },
      );
      const result = feedingSystem.feedRecipe(
        pet,
        'veggie_stew',
        feedingState,
        inventory,
        0, // veggie_stew costs 2 coins
      );
      expect(result).toBeNull();
    });

    it('should give bond bonus for recipes', () => {
      const inventory = createInventory(
        { id: 'apple', qty: 1 },
        { id: 'berries', qty: 1 },
        { id: 'honey', qty: 1 },
      );
      const bondBefore = pet.stats.bond;
      feedingSystem.feedRecipe(pet, 'fruit_salad', feedingState, inventory, 100);
      expect(pet.stats.bond).toBeGreaterThan(bondBefore);
    });

    it('should handle overfeeding on recipe', () => {
      feedingState.fullness = 90;
      const inventory = createInventory(
        { id: 'steak', qty: 1 },
        { id: 'pasta', qty: 1 },
        { id: 'berries', qty: 1 },
      );
      const result = feedingSystem.feedRecipe(
        pet,
        'supreme_feast',
        feedingState,
        inventory,
        100,
      );

      expect(result).not.toBeNull();
      expect(result!.result.reaction).toBe('overfed');
    });
  });

  describe('tickFullness', () => {
    it('should decay fullness over time', () => {
      feedingState.fullness = 50;
      feedingSystem.tickFullness(feedingState, 100);
      expect(feedingState.fullness).toBeLessThan(50);
      expect(feedingState.fullness).toBeCloseTo(50 - FULLNESS_DECAY_RATE * 100, 5);
    });

    it('should not go below 0', () => {
      feedingState.fullness = 0.001;
      feedingSystem.tickFullness(feedingState, 1000);
      expect(feedingState.fullness).toBe(0);
    });
  });

  describe('isUnderfed', () => {
    it('should return false when recently fed', () => {
      feedingState.lastFedTimestamp = Date.now();
      expect(feedingSystem.isUnderfed(feedingState)).toBe(false);
    });

    it('should return true when not fed for too long', () => {
      feedingState.lastFedTimestamp = Date.now() - 3 * 60 * 60 * 1000;
      expect(feedingSystem.isUnderfed(feedingState)).toBe(true);
    });
  });

  describe('applyUnderfeedingPenalty', () => {
    it('should reduce health and energy', () => {
      const healthBefore = pet.stats.health;
      const energyBefore = pet.stats.energy;

      feedingSystem.applyUnderfeedingPenalty(pet);

      expect(pet.stats.health).toBeLessThan(healthBefore);
      expect(pet.stats.energy).toBeLessThan(energyBefore);
    });
  });

  describe('getFavoriteFoods', () => {
    it('should return most liked foods from history', () => {
      feedingState.mealHistory = [
        { foodId: 'apple', timestamp: 1, reaction: 'loved' },
        { foodId: 'apple', timestamp: 2, reaction: 'loved' },
        { foodId: 'berries', timestamp: 3, reaction: 'liked' },
        { foodId: 'carrot', timestamp: 4, reaction: 'neutral' },
      ];

      const favorites = feedingSystem.getFavoriteFoods(feedingState);
      expect(favorites[0]).toBe('apple');
      expect(favorites).toContain('berries');
      expect(favorites).not.toContain('carrot');
    });
  });

  describe('getDislikedFoods', () => {
    it('should return most disliked foods from history', () => {
      feedingState.mealHistory = [
        { foodId: 'leafy_greens', timestamp: 1, reaction: 'disliked' },
        { foodId: 'leafy_greens', timestamp: 2, reaction: 'disliked' },
        { foodId: 'apple', timestamp: 3, reaction: 'loved' },
      ];

      const disliked = feedingSystem.getDislikedFoods(feedingState);
      expect(disliked).toContain('leafy_greens');
      expect(disliked).not.toContain('apple');
    });
  });

  describe('canCraftRecipe', () => {
    it('should return true when ingredients and coins are available', () => {
      const { getRecipeById } = require('../../data/RecipeDatabase');
      const recipe = getRecipeById('fruit_salad')!;
      const inventory = createInventory(
        { id: 'apple', qty: 1 },
        { id: 'berries', qty: 1 },
        { id: 'honey', qty: 1 },
      );

      expect(feedingSystem.canCraftRecipe(recipe, inventory, 100)).toBe(true);
    });

    it('should return false when missing ingredients', () => {
      const { getRecipeById } = require('../../data/RecipeDatabase');
      const recipe = getRecipeById('fruit_salad')!;
      const inventory = createInventory({ id: 'apple', qty: 1 });

      expect(feedingSystem.canCraftRecipe(recipe, inventory, 100)).toBe(false);
    });

    it('should return false when not enough coins', () => {
      const { getRecipeById } = require('../../data/RecipeDatabase');
      const recipe = getRecipeById('veggie_stew')!;
      const inventory = createInventory(
        { id: 'carrot', qty: 1 },
        { id: 'pumpkin', qty: 1 },
        { id: 'mushroom', qty: 1 },
      );

      expect(feedingSystem.canCraftRecipe(recipe, inventory, 0)).toBe(false);
    });
  });
});
