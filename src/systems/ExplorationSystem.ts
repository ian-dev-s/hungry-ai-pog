/**
 * Exploration System — expedition management, outcome calculation,
 * timer management, and loot generation.
 *
 * Pets explore biomes on timed expeditions. Outcomes depend on
 * pet personality, stats, and elemental type. Pets can find items,
 * befriend wild creatures, or face challenges.
 *
 * Exploration unlocks at the adolescent life stage.
 */

import type { PetState } from '../data/SaveSchema';
import {
  type BiomeId,
  type BiomeDefinition,
  type LootEntry,
  type EncounterEntry,
  type EncounterType,
  BIOME_DEFINITIONS,
  EXPLORABLE_STAGES,
  MIN_ENERGY_TO_EXPLORE,
  EXPEDITION_COOLDOWN,
  ENCOUNTERS_PER_EXPEDITION,
  WILD_CREATURE_BOND_BONUS,
  ITEM_FIND_HAPPINESS_BONUS,
  BRAVE_PERSONALITY_INDEX,
  SMART_PERSONALITY_INDEX,
  BRAVE_LOOT_BONUS,
  SMART_CHALLENGE_BONUS,
  RISK_DIFFICULTY_MULTIPLIER,
  RISK_RARE_LOOT_MULTIPLIER,
} from '../data/ExplorationConfig';
import type { ElementType } from '../data/EvolutionArchetypes';
import type { LifeStage } from '../data/StatsConfig';

// ─── Result Types ───────────────────────────────────────────────────────────

export interface CanExploreResult {
  allowed: boolean;
  reason?: string;
}

export interface LootResult {
  itemId: string;
  itemName: string;
  rarity: string;
  description: string;
}

export interface EncounterResult {
  encounterId: string;
  encounterName: string;
  type: EncounterType;
  description: string;
  success: boolean;
  loot: LootResult[];
  statChanges: { stat: string; delta: number }[];
}

export interface ExpeditionResult {
  biomeId: BiomeId;
  biomeName: string;
  duration: number;
  encounters: EncounterResult[];
  totalLoot: LootResult[];
  totalStatChanges: { stat: string; delta: number }[];
  success: boolean;
}

export interface ActiveExpedition {
  biomeId: BiomeId;
  startTimestamp: number;
  duration: number;
}

// ─── Exploration System ─────────────────────────────────────────────────────

export class ExplorationSystem {
  private activeExpedition: ActiveExpedition | null = null;
  private lastExpeditionEndTimestamp = 0;

  /**
   * Check if the pet can start an expedition to the given biome.
   */
  canExplore(pet: PetState, biomeId: BiomeId, now: number): CanExploreResult {
    // Life stage check
    if (!EXPLORABLE_STAGES.includes(pet.lifeStage as LifeStage)) {
      return { allowed: false, reason: 'Pet is too young to explore.' };
    }

    // Already on expedition
    if (this.activeExpedition !== null) {
      return { allowed: false, reason: 'An expedition is already in progress.' };
    }

    // Cooldown check
    const cooldownRemaining = this.getRemainingCooldown(now);
    if (cooldownRemaining > 0) {
      return { allowed: false, reason: `Expedition on cooldown (${Math.ceil(cooldownRemaining)}s remaining).` };
    }

    const biome = BIOME_DEFINITIONS[biomeId];

    // Energy check
    if (pet.stats.energy < MIN_ENERGY_TO_EXPLORE || pet.stats.energy < biome.energyCost) {
      return { allowed: false, reason: 'Pet is too tired to explore.' };
    }

    // Element requirement (Sky Islands = cosmic only)
    if (biome.elementRequirement && !biome.elementRequirement.includes(pet.elementType as ElementType)) {
      return { allowed: false, reason: `Only ${biome.elementRequirement.join('/')} pets can enter ${biome.name}.` };
    }

    // Personality requirement (Cave = bravery check)
    if (biome.personalityRequirement) {
      const { index, minValue } = biome.personalityRequirement;
      if (pet.hiddenStats.personality[index] < minValue) {
        return { allowed: false, reason: `Pet is not brave enough to enter ${biome.name}.` };
      }
    }

    // Stat requirements
    if (biome.statRequirements) {
      for (const [stat, minVal] of Object.entries(biome.statRequirements)) {
        const current = (pet.stats as Record<string, number>)[stat];
        if (current !== undefined && current < minVal) {
          return { allowed: false, reason: `${stat} is too low to enter ${biome.name}.` };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Start an expedition. Deducts energy and begins the timer.
   * Returns null if the pet cannot explore.
   */
  startExpedition(pet: PetState, biomeId: BiomeId, now: number): ActiveExpedition | null {
    const check = this.canExplore(pet, biomeId, now);
    if (!check.allowed) return null;

    const biome = BIOME_DEFINITIONS[biomeId];

    // Deduct energy cost
    pet.stats.energy = Math.max(0, pet.stats.energy - biome.energyCost);

    this.activeExpedition = {
      biomeId,
      startTimestamp: now,
      duration: biome.duration,
    };

    return { ...this.activeExpedition };
  }

  /**
   * Check if the active expedition is complete.
   */
  isExpeditionComplete(now: number): boolean {
    if (!this.activeExpedition) return false;
    const elapsed = (now - this.activeExpedition.startTimestamp) / 1000;
    return elapsed >= this.activeExpedition.duration;
  }

  /**
   * Get the active expedition, if any.
   */
  getActiveExpedition(): ActiveExpedition | null {
    return this.activeExpedition ? { ...this.activeExpedition } : null;
  }

  /**
   * Get remaining expedition time in seconds.
   */
  getRemainingExpeditionTime(now: number): number {
    if (!this.activeExpedition) return 0;
    const elapsed = (now - this.activeExpedition.startTimestamp) / 1000;
    return Math.max(0, this.activeExpedition.duration - elapsed);
  }

  /**
   * Get remaining cooldown in seconds.
   */
  getRemainingCooldown(now: number): number {
    if (this.lastExpeditionEndTimestamp === 0) return 0;
    const elapsed = (now - this.lastExpeditionEndTimestamp) / 1000;
    return Math.max(0, EXPEDITION_COOLDOWN - elapsed);
  }

  /**
   * Complete the active expedition and generate results.
   * Mutates pet stats based on outcomes.
   *
   * @param seed Optional random seed (0-1) for deterministic testing.
   */
  completeExpedition(pet: PetState, now: number, seed?: number): ExpeditionResult | null {
    if (!this.activeExpedition) return null;
    if (!this.isExpeditionComplete(now)) return null;

    const biome = BIOME_DEFINITIONS[this.activeExpedition.biomeId];

    const encounters: EncounterResult[] = [];
    const totalLoot: LootResult[] = [];
    const totalStatChanges: { stat: string; delta: number }[] = [];

    // Generate encounters
    for (let i = 0; i < ENCOUNTERS_PER_EXPEDITION; i++) {
      const encounterSeed = seed !== undefined
        ? ((seed * 1000 + i * 137) % 1000) / 1000
        : Math.random();

      const encounter = this.selectEncounter(biome, encounterSeed);
      const result = this.resolveEncounter(pet, biome, encounter, encounterSeed);

      encounters.push(result);

      // Aggregate loot and stat changes
      for (const loot of result.loot) {
        totalLoot.push(loot);
      }
      for (const change of result.statChanges) {
        totalStatChanges.push(change);
      }
    }

    // Generate base loot (always get something from the biome)
    const baseLootSeed = seed !== undefined
      ? ((seed * 1000 + 999) % 1000) / 1000
      : Math.random();
    const baseLoot = this.rollLoot(pet, biome, baseLootSeed);
    if (baseLoot) {
      totalLoot.push(baseLoot);
    }

    // Apply all stat changes to pet
    for (const change of totalStatChanges) {
      this.applyStatChange(pet, change.stat, change.delta);
    }

    // Record completion
    this.lastExpeditionEndTimestamp = now;
    const completedBiomeId = this.activeExpedition.biomeId;
    const completedDuration = this.activeExpedition.duration;
    this.activeExpedition = null;

    return {
      biomeId: completedBiomeId,
      biomeName: biome.name,
      duration: completedDuration,
      encounters,
      totalLoot,
      totalStatChanges,
      success: true,
    };
  }

  /**
   * Cancel the active expedition (no rewards).
   */
  cancelExpedition(): void {
    this.activeExpedition = null;
  }

  /**
   * Get all biomes available to this pet.
   */
  getAvailableBiomes(pet: PetState, now: number): { biome: BiomeDefinition; canEnter: CanExploreResult }[] {
    return Object.values(BIOME_DEFINITIONS).map((biome) => ({
      biome,
      canEnter: this.canExplore(pet, biome.id, now),
    }));
  }

  // ─── Internal: Encounter Resolution ───────────────────────────────────────

  private selectEncounter(biome: BiomeDefinition, seed: number): EncounterEntry {
    const table = biome.encounterTable;
    const totalWeight = table.reduce((sum, e) => sum + e.weight, 0);
    let roll = seed * totalWeight;

    for (const encounter of table) {
      roll -= encounter.weight;
      if (roll <= 0) return encounter;
    }

    return table[table.length - 1];
  }

  private resolveEncounter(
    pet: PetState,
    biome: BiomeDefinition,
    encounter: EncounterEntry,
    seed: number,
  ): EncounterResult {
    const loot: LootResult[] = [];
    const statChanges: { stat: string; delta: number }[] = [];
    let success = true;

    switch (encounter.type) {
      case 'item_find': {
        // Always succeeds — grant loot
        if (encounter.successLoot) {
          for (const lootId of encounter.successLoot) {
            const entry = this.findLootEntry(biome, lootId);
            if (entry) {
              loot.push({
                itemId: entry.id,
                itemName: entry.name,
                rarity: entry.rarity,
                description: entry.description,
              });
            }
          }
        }
        statChanges.push({ stat: 'happiness', delta: ITEM_FIND_HAPPINESS_BONUS });
        break;
      }

      case 'wild_creature': {
        // Always succeeds — grant bond/happiness rewards
        if (encounter.successReward) {
          if (encounter.successReward.bond) {
            statChanges.push({ stat: 'bond', delta: encounter.successReward.bond + WILD_CREATURE_BOND_BONUS });
          }
          if (encounter.successReward.happiness) {
            statChanges.push({ stat: 'happiness', delta: encounter.successReward.happiness });
          }
        } else {
          statChanges.push({ stat: 'bond', delta: WILD_CREATURE_BOND_BONUS });
        }
        break;
      }

      case 'challenge': {
        success = this.resolveChallenge(pet, biome, encounter, seed);
        if (success) {
          if (encounter.successReward) {
            for (const [stat, delta] of Object.entries(encounter.successReward)) {
              if (delta) statChanges.push({ stat, delta });
            }
          }
          if (encounter.successLoot) {
            for (const lootId of encounter.successLoot) {
              const entry = this.findLootEntry(biome, lootId);
              if (entry) {
                loot.push({
                  itemId: entry.id,
                  itemName: entry.name,
                  rarity: entry.rarity,
                  description: entry.description,
                });
              }
            }
          }
        } else {
          if (encounter.failurePenalty) {
            for (const [stat, delta] of Object.entries(encounter.failurePenalty)) {
              if (delta) statChanges.push({ stat, delta });
            }
          }
        }
        break;
      }
    }

    return {
      encounterId: encounter.id,
      encounterName: encounter.name,
      type: encounter.type,
      description: encounter.description,
      success,
      loot,
      statChanges,
    };
  }

  private resolveChallenge(
    pet: PetState,
    biome: BiomeDefinition,
    encounter: EncounterEntry,
    seed: number,
  ): boolean {
    if (!encounter.checkStat || encounter.checkThreshold === undefined) return true;

    const statValue = (pet.stats as Record<string, number>)[encounter.checkStat] ?? 50;

    // Smart pets get a bonus to challenge checks
    const smartBonus = pet.hiddenStats.personality[SMART_PERSONALITY_INDEX] >= 0.7
      ? SMART_CHALLENGE_BONUS
      : 0;

    // Risk level makes challenges harder
    const difficultyMultiplier = RISK_DIFFICULTY_MULTIPLIER[biome.riskLevel];
    const adjustedThreshold = encounter.checkThreshold * difficultyMultiplier;

    const effectiveStat = statValue + smartBonus;

    // Deterministic: compare stat to threshold with some seed variance
    const variance = (seed - 0.5) * 20; // -10 to +10
    return (effectiveStat + variance) >= adjustedThreshold;
  }

  // ─── Internal: Loot Generation ────────────────────────────────────────────

  private rollLoot(pet: PetState, biome: BiomeDefinition, seed: number): LootResult | null {
    const table = biome.lootTable;
    if (table.length === 0) return null;

    // Calculate weights with bonuses
    const isBrave = pet.hiddenStats.personality[BRAVE_PERSONALITY_INDEX] >= 0.7;
    const hasElementBonus = biome.elementBonus?.includes(pet.elementType as ElementType) ?? false;
    const rareMultiplier = RISK_RARE_LOOT_MULTIPLIER[biome.riskLevel];

    const adjustedWeights = table.map((entry) => {
      let weight = entry.weight;

      // Brave pets get better loot
      if (isBrave && (entry.rarity === 'rare' || entry.rarity === 'legendary')) {
        weight *= BRAVE_LOOT_BONUS;
      }

      // Element bonus
      if (hasElementBonus) {
        weight *= (biome.elementBonusMultiplier ?? 1.0);
      }

      // Risk level boosts rare items
      if (entry.rarity === 'rare' || entry.rarity === 'legendary') {
        weight *= rareMultiplier;
      }

      return weight;
    });

    const totalWeight = adjustedWeights.reduce((sum, w) => sum + w, 0);
    let roll = seed * totalWeight;

    for (let i = 0; i < table.length; i++) {
      roll -= adjustedWeights[i];
      if (roll <= 0) {
        return {
          itemId: table[i].id,
          itemName: table[i].name,
          rarity: table[i].rarity,
          description: table[i].description,
        };
      }
    }

    const last = table[table.length - 1];
    return {
      itemId: last.id,
      itemName: last.name,
      rarity: last.rarity,
      description: last.description,
    };
  }

  private findLootEntry(biome: BiomeDefinition, lootId: string): LootEntry | undefined {
    return biome.lootTable.find((e) => e.id === lootId);
  }

  private applyStatChange(pet: PetState, stat: string, delta: number): void {
    const stats = pet.stats as Record<string, number>;
    if (stat in stats) {
      stats[stat] = Math.max(0, Math.min(100, stats[stat] + delta));
    }
  }
}
