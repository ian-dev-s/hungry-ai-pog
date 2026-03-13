/**
 * Economy system — manages coins, materials, shop transactions,
 * crafting, and daily care streak bonuses.
 */

import type { InventoryItem } from '../data/SaveSchema';
import type { ShopItem } from '../data/ShopCatalog';
import { getShopItemById } from '../data/ShopCatalog';
import type { CraftingRecipe, MaterialType } from '../data/CraftingRecipes';
import { getCraftingRecipeById, MATERIAL_TYPES } from '../data/CraftingRecipes';

/** Coin rewards for various gameplay activities. */
export const COIN_REWARDS = {
  miniGameWin: 10,
  miniGameParticipation: 3,
  explorationFind: 5,
  dailyCareBase: 15,
  dailyCareStreakBonus: 5,
  /** Maximum streak multiplier cap. */
  maxStreakBonus: 50,
} as const;

/** One calendar day in milliseconds. */
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Maximum number of consecutive streak days before the bonus caps. */
export const MAX_STREAK_DAYS = 7;

export interface EconomyState {
  coins: number;
  materials: Record<MaterialType, number>;
  dailyStreak: {
    count: number;
    lastCheckIn: number;
  };
  /** Item IDs the player has permanently unlocked (room items, cosmetics). */
  unlockedItems: string[];
}

export function createDefaultEconomyState(): EconomyState {
  return {
    coins: 0,
    materials: {
      wood: 0,
      stone: 0,
      crystal: 0,
      fabric: 0,
      herbs: 0,
    },
    dailyStreak: {
      count: 0,
      lastCheckIn: 0,
    },
    unlockedItems: [],
  };
}

export class EconomySystem {
  // --- Coin Management ---

  /** Add coins to the economy state. Returns the new total. */
  addCoins(state: EconomyState, amount: number): number {
    if (amount < 0) return state.coins;
    state.coins += amount;
    return state.coins;
  }

  /** Remove coins from the economy state. Returns false if insufficient funds. */
  spendCoins(state: EconomyState, amount: number): boolean {
    if (amount < 0 || state.coins < amount) return false;
    state.coins -= amount;
    return true;
  }

  /** Get current coin balance. */
  getBalance(state: EconomyState): number {
    return state.coins;
  }

  // --- Material Management ---

  /** Add materials to the economy state. */
  addMaterial(
    state: EconomyState,
    material: MaterialType,
    amount: number,
  ): number {
    if (amount < 0) return state.materials[material];
    state.materials[material] += amount;
    return state.materials[material];
  }

  /** Check if player has enough of a specific material. */
  hasMaterial(
    state: EconomyState,
    material: MaterialType,
    amount: number,
  ): boolean {
    return state.materials[material] >= amount;
  }

  /** Get current count of a material. */
  getMaterialCount(state: EconomyState, material: MaterialType): number {
    return state.materials[material];
  }

  /** Get all material counts. */
  getAllMaterials(state: EconomyState): Record<MaterialType, number> {
    return { ...state.materials };
  }

  // --- Shop Transactions ---

  /**
   * Purchase an item from the shop.
   * For consumables (food, medicine): adds to inventory.
   * For unlocks (room, cosmetics): adds to unlockedItems if not already owned.
   * Returns null on failure, or the purchased item on success.
   */
  purchaseItem(
    state: EconomyState,
    itemId: string,
    inventory: InventoryItem[],
  ): ShopItem | null {
    const shopItem = getShopItemById(itemId);
    if (!shopItem) return null;

    // Check if already unlocked (for unlock items)
    if (shopItem.isUnlock && state.unlockedItems.includes(itemId)) {
      return null;
    }

    // Check funds
    if (state.coins < shopItem.cost) return null;

    // Deduct coins
    state.coins -= shopItem.cost;

    if (shopItem.isUnlock) {
      // Permanent unlock
      state.unlockedItems.push(itemId);
    } else {
      // Add to inventory
      const existing = inventory.find((i) => i.id === itemId);
      if (existing) {
        existing.quantity += 1;
      } else {
        inventory.push({
          id: itemId,
          type: shopItem.category,
          quantity: 1,
        });
      }
    }

    return shopItem;
  }

  /**
   * Check if the player can afford a shop item.
   */
  canAfford(state: EconomyState, itemId: string): boolean {
    const shopItem = getShopItemById(itemId);
    if (!shopItem) return false;
    if (shopItem.isUnlock && state.unlockedItems.includes(itemId)) return false;
    return state.coins >= shopItem.cost;
  }

  // --- Crafting ---

  /**
   * Check if the player has enough materials and coins for a recipe.
   */
  canCraft(state: EconomyState, recipeId: string): boolean {
    const recipe = getCraftingRecipeById(recipeId);
    if (!recipe) return false;

    if (state.coins < recipe.coinCost) return false;

    for (const mat of recipe.materials) {
      if (state.materials[mat.material] < mat.amount) return false;
    }

    return true;
  }

  /**
   * Craft an item using a recipe. Consumes materials and coins,
   * adds the output item to inventory.
   * Returns null on failure, or the recipe on success.
   */
  craftItem(
    state: EconomyState,
    recipeId: string,
    inventory: InventoryItem[],
  ): CraftingRecipe | null {
    const recipe = getCraftingRecipeById(recipeId);
    if (!recipe) return null;

    // Verify resources
    if (!this.canCraft(state, recipeId)) return null;

    // Deduct coins
    state.coins -= recipe.coinCost;

    // Deduct materials
    for (const mat of recipe.materials) {
      state.materials[mat.material] -= mat.amount;
    }

    // Add output to inventory
    const existing = inventory.find((i) => i.id === recipe.outputItemId);
    if (existing) {
      existing.quantity += recipe.outputQuantity;
    } else {
      inventory.push({
        id: recipe.outputItemId,
        type: recipe.category,
        quantity: recipe.outputQuantity,
      });
    }

    return recipe;
  }

  // --- Daily Care Streak ---

  /**
   * Process a daily check-in. Awards coins based on streak length.
   * Call this when the player performs their first care action of the day.
   * Returns the coins awarded, or 0 if already checked in today.
   */
  processDailyCheckIn(state: EconomyState, now: number = Date.now()): number {
    const lastCheckIn = state.dailyStreak.lastCheckIn;

    // Check if already checked in today
    if (this.isSameDay(lastCheckIn, now)) {
      return 0;
    }

    // Check if streak continues (checked in yesterday) or resets
    if (this.isConsecutiveDay(lastCheckIn, now)) {
      state.dailyStreak.count = Math.min(
        state.dailyStreak.count + 1,
        MAX_STREAK_DAYS,
      );
    } else {
      state.dailyStreak.count = 1;
    }

    state.dailyStreak.lastCheckIn = now;

    // Calculate and award coins
    const reward = this.calculateStreakReward(state.dailyStreak.count);
    state.coins += reward;

    return reward;
  }

  /**
   * Calculate the coin reward for a given streak count.
   */
  calculateStreakReward(streakCount: number): number {
    const bonus = Math.min(
      (streakCount - 1) * COIN_REWARDS.dailyCareStreakBonus,
      COIN_REWARDS.maxStreakBonus,
    );
    return COIN_REWARDS.dailyCareBase + bonus;
  }

  /** Get current streak count. */
  getStreakCount(state: EconomyState): number {
    return state.dailyStreak.count;
  }

  // --- Gameplay Rewards ---

  /** Award coins for winning a mini-game. */
  rewardMiniGameWin(state: EconomyState): number {
    state.coins += COIN_REWARDS.miniGameWin;
    return COIN_REWARDS.miniGameWin;
  }

  /** Award coins for participating in a mini-game (loss). */
  rewardMiniGameParticipation(state: EconomyState): number {
    state.coins += COIN_REWARDS.miniGameParticipation;
    return COIN_REWARDS.miniGameParticipation;
  }

  /** Award coins and a random material for exploration finds. */
  rewardExplorationFind(
    state: EconomyState,
    material: MaterialType,
    materialAmount: number = 1,
  ): { coins: number; material: MaterialType; amount: number } {
    state.coins += COIN_REWARDS.explorationFind;
    state.materials[material] += materialAmount;
    return {
      coins: COIN_REWARDS.explorationFind,
      material,
      amount: materialAmount,
    };
  }

  // --- Helpers ---

  /** Check if two timestamps fall on the same calendar day. */
  private isSameDay(ts1: number, ts2: number): boolean {
    if (ts1 === 0 || ts2 === 0) return false;
    const d1 = new Date(ts1);
    const d2 = new Date(ts2);
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  /** Check if ts2 is exactly one calendar day after ts1. */
  private isConsecutiveDay(ts1: number, ts2: number): boolean {
    if (ts1 === 0) return false;
    const d1 = new Date(ts1);
    const d2 = new Date(ts2);
    // Set both to start of day and compare
    const startOfDay1 = new Date(
      d1.getFullYear(),
      d1.getMonth(),
      d1.getDate(),
    ).getTime();
    const startOfDay2 = new Date(
      d2.getFullYear(),
      d2.getMonth(),
      d2.getDate(),
    ).getTime();
    return startOfDay2 - startOfDay1 === ONE_DAY_MS;
  }
}
