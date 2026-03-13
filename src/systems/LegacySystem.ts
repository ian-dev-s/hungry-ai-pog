/**
 * Legacy system for elder pet retirement and replayability.
 * When a pet reaches Elder stage, it can leave a Legacy Egg that carries
 * one inherited trait or stat bonus into the next generation.
 * The family tree tracks all retired pets and their legacy contributions.
 */

import {
  ALL_LEGACY_TRAITS,
  LEGACY_STAT_KEYS,
  LEGACY_TRAITS,
  type LegacyTrait,
  type LegacyTraitId,
  type StatBonus,
} from '@data/LegacyConfig';
import { LifeStage } from '@data/LifeStages';
import type { FamilyTreeEntry, PetState, SaveData } from '@data/SaveSchema';

export interface LegacyEgg {
  /** Unique ID for the legacy egg. */
  id: string;
  /** The trait inherited from the ancestor. */
  legacyTrait: LegacyTrait;
  /** Name of the ancestor that left this egg. */
  ancestorName: string;
  /** Element type inherited from the ancestor. */
  elementType: string;
  /** Timestamp when the legacy egg was created. */
  createdAt: number;
}

/** Result of determining the legacy trait for an elder pet. */
export interface LegacyDetermination {
  trait: LegacyTrait;
  /** The stat value that qualified this trait, or null for balanced_nature fallback. */
  qualifyingStatValue: number | null;
}

/** Threshold for considering a pet to have "balanced" stats (all within this range). */
const BALANCE_THRESHOLD = 15;

export class LegacySystem {
  /**
   * Check whether the pet is eligible to leave a legacy.
   * Requires Elder stage.
   */
  canLeaveLegacy(pet: PetState): boolean {
    return pet.lifeStage === LifeStage.Elder;
  }

  /**
   * Determine which legacy trait the elder pet will pass on.
   * Selects the trait matching the pet's highest qualifying stat.
   * Falls back to 'balanced_nature' if all stats are within a narrow range.
   */
  determineLegacyTrait(pet: PetState): LegacyDetermination {
    const stats = pet.stats;

    // Check if all stats are balanced (within BALANCE_THRESHOLD of each other)
    const statValues = LEGACY_STAT_KEYS.map((k) => stats[k]);
    const minVal = Math.min(...statValues);
    const maxVal = Math.max(...statValues);
    if (maxVal - minVal <= BALANCE_THRESHOLD) {
      return {
        trait: LEGACY_TRAITS.balanced_nature,
        qualifyingStatValue: null,
      };
    }

    // Find the eligible trait whose primary stat is highest
    let bestTrait: LegacyTrait | null = null;
    let bestStatValue = -1;

    for (const trait of ALL_LEGACY_TRAITS) {
      if (trait.id === 'balanced_nature') continue;
      const statValue = stats[trait.primaryStat] ?? 0;
      if (statValue >= trait.minStatValue && statValue > bestStatValue) {
        bestStatValue = statValue;
        bestTrait = trait;
      }
    }

    if (bestTrait !== null) {
      return { trait: bestTrait, qualifyingStatValue: bestStatValue };
    }

    // No stat met the minimum threshold — fall back to balanced_nature
    return {
      trait: LEGACY_TRAITS.balanced_nature,
      qualifyingStatValue: null,
    };
  }

  /**
   * Create a Legacy Egg from the elder pet.
   * The egg carries the inherited trait into the next generation.
   */
  createLegacyEgg(pet: PetState, now: number = Date.now()): LegacyEgg {
    const { trait } = this.determineLegacyTrait(pet);
    return {
      id: `legacy_${pet.name}_${now}`,
      legacyTrait: trait,
      ancestorName: pet.name,
      elementType: pet.elementType,
      createdAt: now,
    };
  }

  /**
   * Apply a legacy bonus to a new pet's starting stats.
   * Clamps all resulting stat values to [0, 100].
   */
  applyLegacyBonus(
    stats: PetState['stats'],
    bonus: StatBonus,
  ): PetState['stats'] {
    const updated = { ...stats };
    for (const key of Object.keys(bonus) as Array<keyof StatBonus>) {
      const bonusAmount = bonus[key] ?? 0;
      updated[key] = Math.min(100, Math.max(0, updated[key] + bonusAmount));
    }
    return updated;
  }

  /**
   * Build a FamilyTreeEntry for the retiring elder pet.
   * Call this before creating the new pet.
   */
  buildFamilyTreeEntry(
    pet: PetState,
    parentId: string | null,
    now: number = Date.now(),
  ): FamilyTreeEntry {
    const { trait } = this.determineLegacyTrait(pet);
    return {
      petId: `${pet.name}_${pet.birthTimestamp}`,
      name: pet.name,
      elementType: pet.elementType,
      evolutionPath: pet.evolutionPath,
      birthTimestamp: pet.birthTimestamp,
      retiredTimestamp: now,
      parentId,
      legacyTrait: trait.id as LegacyTraitId,
    };
  }

  /**
   * Retire the elder pet: add it to the family tree, return the legacy egg.
   * Mutates save.familyTree but does NOT modify save.pet (caller handles new pet creation).
   *
   * @returns The legacy egg left behind, or null if pet is not eligible.
   */
  retirePet(
    save: SaveData,
    parentId: string | null = null,
    now: number = Date.now(),
  ): LegacyEgg | null {
    if (!save.pet) return null;
    if (!this.canLeaveLegacy(save.pet)) return null;

    const entry = this.buildFamilyTreeEntry(save.pet, parentId, now);
    save.familyTree.push(entry);

    const egg = this.createLegacyEgg(save.pet, now);
    return egg;
  }

  /**
   * Get all entries in the family tree from the save data.
   */
  getFamilyTree(save: SaveData): FamilyTreeEntry[] {
    return [...save.familyTree];
  }

  /**
   * Find the direct ancestor of a given pet in the family tree.
   */
  findParent(save: SaveData, parentId: string): FamilyTreeEntry | undefined {
    return save.familyTree.find((e) => e.petId === parentId);
  }
}
