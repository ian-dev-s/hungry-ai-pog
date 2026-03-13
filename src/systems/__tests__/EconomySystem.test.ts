import { describe, it, expect, beforeEach } from 'vitest';
import {
  EconomySystem,
  createDefaultEconomyState,
  COIN_REWARDS,
  MAX_STREAK_DAYS,
} from '../EconomySystem';
import type { EconomyState } from '../EconomySystem';
import type { InventoryItem } from '../../data/SaveSchema';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function createInventory(
  ...items: { id: string; type: string; qty: number }[]
): InventoryItem[] {
  return items.map((i) => ({ id: i.id, type: i.type, quantity: i.qty }));
}

describe('EconomySystem', () => {
  let economy: EconomySystem;
  let state: EconomyState;

  beforeEach(() => {
    economy = new EconomySystem();
    state = createDefaultEconomyState();
  });

  // --- Coin Management ---

  describe('addCoins', () => {
    it('should add coins and return new total', () => {
      const total = economy.addCoins(state, 50);
      expect(total).toBe(50);
      expect(state.coins).toBe(50);
    });

    it('should accumulate coins across multiple additions', () => {
      economy.addCoins(state, 10);
      economy.addCoins(state, 25);
      expect(state.coins).toBe(35);
    });

    it('should ignore negative amounts', () => {
      economy.addCoins(state, 50);
      const total = economy.addCoins(state, -10);
      expect(total).toBe(50);
    });
  });

  describe('spendCoins', () => {
    it('should deduct coins and return true on success', () => {
      state.coins = 100;
      const result = economy.spendCoins(state, 30);
      expect(result).toBe(true);
      expect(state.coins).toBe(70);
    });

    it('should return false when insufficient funds', () => {
      state.coins = 10;
      const result = economy.spendCoins(state, 50);
      expect(result).toBe(false);
      expect(state.coins).toBe(10);
    });

    it('should return false for negative amounts', () => {
      state.coins = 100;
      const result = economy.spendCoins(state, -5);
      expect(result).toBe(false);
    });

    it('should allow spending exact balance', () => {
      state.coins = 50;
      const result = economy.spendCoins(state, 50);
      expect(result).toBe(true);
      expect(state.coins).toBe(0);
    });
  });

  describe('getBalance', () => {
    it('should return current coin balance', () => {
      state.coins = 42;
      expect(economy.getBalance(state)).toBe(42);
    });
  });

  // --- Material Management ---

  describe('addMaterial', () => {
    it('should add material and return new count', () => {
      const count = economy.addMaterial(state, 'wood', 5);
      expect(count).toBe(5);
      expect(state.materials.wood).toBe(5);
    });

    it('should accumulate materials', () => {
      economy.addMaterial(state, 'crystal', 2);
      economy.addMaterial(state, 'crystal', 3);
      expect(state.materials.crystal).toBe(5);
    });

    it('should ignore negative amounts', () => {
      economy.addMaterial(state, 'stone', 5);
      const count = economy.addMaterial(state, 'stone', -3);
      expect(count).toBe(5);
    });
  });

  describe('hasMaterial', () => {
    it('should return true when enough material exists', () => {
      state.materials.herbs = 10;
      expect(economy.hasMaterial(state, 'herbs', 5)).toBe(true);
    });

    it('should return false when not enough material', () => {
      state.materials.fabric = 2;
      expect(economy.hasMaterial(state, 'fabric', 5)).toBe(false);
    });

    it('should return true for exact amount', () => {
      state.materials.wood = 3;
      expect(economy.hasMaterial(state, 'wood', 3)).toBe(true);
    });
  });

  describe('getMaterialCount', () => {
    it('should return the count of a specific material', () => {
      state.materials.stone = 7;
      expect(economy.getMaterialCount(state, 'stone')).toBe(7);
    });
  });

  describe('getAllMaterials', () => {
    it('should return a copy of all material counts', () => {
      state.materials.wood = 3;
      state.materials.crystal = 1;
      const materials = economy.getAllMaterials(state);
      expect(materials.wood).toBe(3);
      expect(materials.crystal).toBe(1);
      // Ensure it is a copy
      materials.wood = 99;
      expect(state.materials.wood).toBe(3);
    });
  });

  // --- Shop Transactions ---

  describe('purchaseItem', () => {
    it('should purchase a consumable item and add to inventory', () => {
      state.coins = 100;
      const inventory: InventoryItem[] = [];
      const result = economy.purchaseItem(state, 'apple', inventory);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('apple');
      expect(state.coins).toBe(95); // apple costs 5
      expect(inventory.length).toBe(1);
      expect(inventory[0].id).toBe('apple');
      expect(inventory[0].quantity).toBe(1);
    });

    it('should stack consumable items in inventory', () => {
      state.coins = 100;
      const inventory = createInventory({ id: 'apple', type: 'food', qty: 2 });
      economy.purchaseItem(state, 'apple', inventory);

      expect(inventory[0].quantity).toBe(3);
    });

    it('should unlock room items', () => {
      state.coins = 100;
      const inventory: InventoryItem[] = [];
      const result = economy.purchaseItem(state, 'cozy_bed', inventory);

      expect(result).not.toBeNull();
      expect(state.coins).toBe(50); // cozy_bed costs 50
      expect(state.unlockedItems).toContain('cozy_bed');
      // Unlock items don't go to inventory
      expect(inventory.length).toBe(0);
    });

    it('should not allow purchasing an already unlocked item', () => {
      state.coins = 200;
      state.unlockedItems.push('cozy_bed');
      const inventory: InventoryItem[] = [];
      const result = economy.purchaseItem(state, 'cozy_bed', inventory);

      expect(result).toBeNull();
      expect(state.coins).toBe(200);
    });

    it('should return null when insufficient coins', () => {
      state.coins = 1;
      const inventory: InventoryItem[] = [];
      const result = economy.purchaseItem(state, 'steak', inventory);

      expect(result).toBeNull();
      expect(state.coins).toBe(1);
    });

    it('should return null for unknown item id', () => {
      state.coins = 100;
      const inventory: InventoryItem[] = [];
      const result = economy.purchaseItem(state, 'nonexistent', inventory);

      expect(result).toBeNull();
    });
  });

  describe('canAfford', () => {
    it('should return true when coins are sufficient', () => {
      state.coins = 100;
      expect(economy.canAfford(state, 'apple')).toBe(true);
    });

    it('should return false when coins are insufficient', () => {
      state.coins = 1;
      expect(economy.canAfford(state, 'steak')).toBe(false);
    });

    it('should return false for already unlocked items', () => {
      state.coins = 100;
      state.unlockedItems.push('cozy_bed');
      expect(economy.canAfford(state, 'cozy_bed')).toBe(false);
    });

    it('should return false for unknown items', () => {
      state.coins = 100;
      expect(economy.canAfford(state, 'nonexistent')).toBe(false);
    });
  });

  // --- Crafting ---

  describe('canCraft', () => {
    it('should return true when materials and coins are sufficient', () => {
      state.coins = 50;
      state.materials.wood = 5;
      state.materials.stone = 3;
      // craft_wooden_shelf needs: wood 3, stone 1, 10 coins
      expect(economy.canCraft(state, 'craft_wooden_shelf')).toBe(true);
    });

    it('should return false when missing materials', () => {
      state.coins = 50;
      state.materials.wood = 1; // needs 3
      state.materials.stone = 5;
      expect(economy.canCraft(state, 'craft_wooden_shelf')).toBe(false);
    });

    it('should return false when insufficient coins', () => {
      state.coins = 1;
      state.materials.wood = 5;
      state.materials.stone = 5;
      expect(economy.canCraft(state, 'craft_wooden_shelf')).toBe(false);
    });

    it('should return false for unknown recipe', () => {
      state.coins = 100;
      expect(economy.canCraft(state, 'nonexistent_recipe')).toBe(false);
    });
  });

  describe('craftItem', () => {
    it('should consume materials and coins, then add item to inventory', () => {
      state.coins = 50;
      state.materials.wood = 5;
      state.materials.stone = 3;
      const inventory: InventoryItem[] = [];

      const result = economy.craftItem(state, 'craft_wooden_shelf', inventory);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('craft_wooden_shelf');
      expect(state.coins).toBe(40); // 50 - 10
      expect(state.materials.wood).toBe(2); // 5 - 3
      expect(state.materials.stone).toBe(2); // 3 - 1
      expect(inventory.length).toBe(1);
      expect(inventory[0].id).toBe('bookshelf');
      expect(inventory[0].quantity).toBe(1);
    });

    it('should stack output items in existing inventory', () => {
      state.coins = 50;
      state.materials.herbs = 5;
      const inventory = createInventory({
        id: 'herbal_tea',
        type: 'meals',
        qty: 1,
      });

      // craft_herbal_tea outputs 2 herbal_tea
      economy.craftItem(state, 'craft_herbal_tea', inventory);

      expect(inventory[0].quantity).toBe(3); // 1 + 2
    });

    it('should return null when cannot craft', () => {
      state.coins = 0;
      const inventory: InventoryItem[] = [];
      const result = economy.craftItem(state, 'craft_wooden_shelf', inventory);

      expect(result).toBeNull();
    });

    it('should return null for unknown recipe', () => {
      state.coins = 100;
      const inventory: InventoryItem[] = [];
      const result = economy.craftItem(state, 'nonexistent', inventory);

      expect(result).toBeNull();
    });

    it('should handle recipes with multiple material types', () => {
      state.coins = 50;
      state.materials.stone = 5;
      state.materials.crystal = 5;
      const inventory: InventoryItem[] = [];

      // craft_stone_lamp needs: stone 2, crystal 1, 15 coins
      const result = economy.craftItem(state, 'craft_stone_lamp', inventory);

      expect(result).not.toBeNull();
      expect(state.materials.stone).toBe(3);
      expect(state.materials.crystal).toBe(4);
      expect(state.coins).toBe(35);
      expect(inventory[0].id).toBe('nightlight');
    });
  });

  // --- Daily Care Streak ---

  describe('processDailyCheckIn', () => {
    it('should award base coins on first check-in', () => {
      const now = new Date(2026, 2, 13, 10, 0, 0).getTime();
      const reward = economy.processDailyCheckIn(state, now);

      expect(reward).toBe(COIN_REWARDS.dailyCareBase);
      expect(state.dailyStreak.count).toBe(1);
      expect(state.coins).toBe(COIN_REWARDS.dailyCareBase);
    });

    it('should return 0 if already checked in today', () => {
      const now = new Date(2026, 2, 13, 10, 0, 0).getTime();
      economy.processDailyCheckIn(state, now);

      const laterToday = new Date(2026, 2, 13, 18, 0, 0).getTime();
      const reward = economy.processDailyCheckIn(state, laterToday);

      expect(reward).toBe(0);
    });

    it('should increment streak for consecutive days', () => {
      const day1 = new Date(2026, 2, 10, 10, 0, 0).getTime();
      const day2 = new Date(2026, 2, 11, 10, 0, 0).getTime();
      const day3 = new Date(2026, 2, 12, 10, 0, 0).getTime();

      economy.processDailyCheckIn(state, day1);
      economy.processDailyCheckIn(state, day2);
      economy.processDailyCheckIn(state, day3);

      expect(state.dailyStreak.count).toBe(3);
    });

    it('should reset streak when a day is missed', () => {
      const day1 = new Date(2026, 2, 10, 10, 0, 0).getTime();
      const day3 = new Date(2026, 2, 12, 10, 0, 0).getTime(); // skipped day 11

      economy.processDailyCheckIn(state, day1);
      economy.processDailyCheckIn(state, day3);

      expect(state.dailyStreak.count).toBe(1);
    });

    it('should award increasing coins with streak', () => {
      const rewards: number[] = [];
      for (let i = 0; i < 5; i++) {
        const day = new Date(2026, 2, 10 + i, 10, 0, 0).getTime();
        rewards.push(economy.processDailyCheckIn(state, day));
      }

      // Day 1: base only, Day 2: base + 1*bonus, Day 3: base + 2*bonus ...
      expect(rewards[0]).toBe(COIN_REWARDS.dailyCareBase);
      expect(rewards[1]).toBe(
        COIN_REWARDS.dailyCareBase + COIN_REWARDS.dailyCareStreakBonus,
      );
      expect(rewards[2]).toBe(
        COIN_REWARDS.dailyCareBase + 2 * COIN_REWARDS.dailyCareStreakBonus,
      );
      // Each subsequent reward should be greater than the previous
      for (let i = 1; i < rewards.length; i++) {
        expect(rewards[i]).toBeGreaterThan(rewards[i - 1]);
      }
    });

    it('should cap streak at MAX_STREAK_DAYS', () => {
      for (let i = 0; i < MAX_STREAK_DAYS + 3; i++) {
        const day = new Date(2026, 2, 1 + i, 10, 0, 0).getTime();
        economy.processDailyCheckIn(state, day);
      }

      expect(state.dailyStreak.count).toBe(MAX_STREAK_DAYS);
    });
  });

  describe('calculateStreakReward', () => {
    it('should return base reward for streak of 1', () => {
      expect(economy.calculateStreakReward(1)).toBe(COIN_REWARDS.dailyCareBase);
    });

    it('should include bonus for higher streaks', () => {
      const reward = economy.calculateStreakReward(3);
      expect(reward).toBe(
        COIN_REWARDS.dailyCareBase + 2 * COIN_REWARDS.dailyCareStreakBonus,
      );
    });

    it('should cap the bonus at maxStreakBonus', () => {
      const reward = economy.calculateStreakReward(100);
      expect(reward).toBe(
        COIN_REWARDS.dailyCareBase + COIN_REWARDS.maxStreakBonus,
      );
    });
  });

  describe('getStreakCount', () => {
    it('should return current streak count', () => {
      state.dailyStreak.count = 5;
      expect(economy.getStreakCount(state)).toBe(5);
    });
  });

  // --- Gameplay Rewards ---

  describe('rewardMiniGameWin', () => {
    it('should add miniGameWin coins', () => {
      const reward = economy.rewardMiniGameWin(state);
      expect(reward).toBe(COIN_REWARDS.miniGameWin);
      expect(state.coins).toBe(COIN_REWARDS.miniGameWin);
    });
  });

  describe('rewardMiniGameParticipation', () => {
    it('should add miniGameParticipation coins', () => {
      const reward = economy.rewardMiniGameParticipation(state);
      expect(reward).toBe(COIN_REWARDS.miniGameParticipation);
      expect(state.coins).toBe(COIN_REWARDS.miniGameParticipation);
    });
  });

  describe('rewardExplorationFind', () => {
    it('should add coins and materials', () => {
      const result = economy.rewardExplorationFind(state, 'crystal', 2);

      expect(result.coins).toBe(COIN_REWARDS.explorationFind);
      expect(result.material).toBe('crystal');
      expect(result.amount).toBe(2);
      expect(state.coins).toBe(COIN_REWARDS.explorationFind);
      expect(state.materials.crystal).toBe(2);
    });

    it('should default to 1 material when amount not specified', () => {
      const result = economy.rewardExplorationFind(state, 'wood');

      expect(result.amount).toBe(1);
      expect(state.materials.wood).toBe(1);
    });
  });

  // --- Integration Scenarios ---

  describe('integration', () => {
    it('should support a full earn-and-spend flow', () => {
      // Earn coins from mini-games
      economy.rewardMiniGameWin(state);
      economy.rewardMiniGameWin(state);
      economy.rewardMiniGameParticipation(state);

      const expectedCoins =
        COIN_REWARDS.miniGameWin * 2 + COIN_REWARDS.miniGameParticipation;
      expect(state.coins).toBe(expectedCoins);

      // Buy some food
      const inventory: InventoryItem[] = [];
      economy.purchaseItem(state, 'apple', inventory); // 5 coins
      economy.purchaseItem(state, 'banana', inventory); // 4 coins

      expect(inventory.length).toBe(2);
      expect(state.coins).toBe(expectedCoins - 5 - 4);
    });

    it('should support exploration into crafting flow', () => {
      state.coins = 50;

      // Find materials during exploration
      economy.rewardExplorationFind(state, 'wood', 3);
      economy.rewardExplorationFind(state, 'stone', 2);

      // Craft a wooden shelf (needs: wood 3, stone 1, 10 coins)
      const inventory: InventoryItem[] = [];
      const result = economy.craftItem(state, 'craft_wooden_shelf', inventory);

      expect(result).not.toBeNull();
      expect(inventory[0].id).toBe('bookshelf');
      expect(state.materials.wood).toBe(0);
      expect(state.materials.stone).toBe(1);
    });

    it('should handle daily streak with shop purchases', () => {
      const day1 = new Date(2026, 2, 10, 10, 0, 0).getTime();
      const day2 = new Date(2026, 2, 11, 10, 0, 0).getTime();

      economy.processDailyCheckIn(state, day1);
      economy.processDailyCheckIn(state, day2);

      // Should have earned base + (base + bonus)
      const expectedCoins =
        COIN_REWARDS.dailyCareBase +
        COIN_REWARDS.dailyCareBase +
        COIN_REWARDS.dailyCareStreakBonus;
      expect(state.coins).toBe(expectedCoins);

      // Buy a cosmetic with streak earnings
      const inventory: InventoryItem[] = [];
      const result = economy.purchaseItem(state, 'bandana', inventory);

      expect(result).not.toBeNull();
      expect(state.unlockedItems).toContain('bandana');
    });
  });
});
