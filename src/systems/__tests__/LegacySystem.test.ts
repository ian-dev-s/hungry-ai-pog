import { describe, it, expect, beforeEach } from 'vitest';
import { LegacySystem } from '../LegacySystem';
import { LifeStage } from '../../data/LifeStages';
import { LEGACY_TRAITS } from '../../data/LegacyConfig';
import {
  type PetState,
  type SaveData,
  createDefaultTrainingState,
  createDefaultHygieneState,
  createDefaultSleepState,
  createDefaultSave,
} from '../../data/SaveSchema';

function createElderPet(statOverrides: Partial<PetState['stats']> = {}): PetState {
  return {
    name: 'TestElder',
    elementType: 'fire',
    lifeStage: LifeStage.Elder,
    stats: {
      hunger: 80,
      happiness: 80,
      energy: 80,
      hygiene: 80,
      health: 80,
      bond: 80,
      discipline: 80,
      ...statOverrides,
    },
    hiddenStats: {
      personality: [0.5, 0.5, 0.5, 0.5],
      trust: 50,
      stress: 10,
    },
    illness: { type: null, startTimestamp: null },
    evolutionPath: 'ember_drake',
    birthTimestamp: 1000,
    stageStartTimestamp: 2000,
    careHistory: {
      happinessAvg: 75,
      disciplineRatio: 0.5,
      uniqueFoodsCount: 5,
      activitiesCompleted: 20,
      bondAvg: 70,
      secretFlags: {},
    },
    training: createDefaultTrainingState(),
    hygieneCare: createDefaultHygieneState(),
    sleep: createDefaultSleepState(),
  };
}

function createSaveWithElderPet(statOverrides: Partial<PetState['stats']> = {}): SaveData {
  const save = createDefaultSave();
  save.pet = createElderPet(statOverrides);
  return save;
}

describe('LegacySystem', () => {
  let system: LegacySystem;

  beforeEach(() => {
    system = new LegacySystem();
  });

  describe('canLeaveLegacy', () => {
    it('returns true for an Elder stage pet', () => {
      const pet = createElderPet();
      expect(system.canLeaveLegacy(pet)).toBe(true);
    });

    it('returns false for a non-Elder stage pet', () => {
      const adultPet = createElderPet();
      adultPet.lifeStage = LifeStage.Adult;
      expect(system.canLeaveLegacy(adultPet)).toBe(false);
    });

    it('returns false for Juvenile stage', () => {
      const juvenilePet = createElderPet();
      juvenilePet.lifeStage = LifeStage.Juvenile;
      expect(system.canLeaveLegacy(juvenilePet)).toBe(false);
    });
  });

  describe('determineLegacyTrait', () => {
    it('returns balanced_nature when all stats are within threshold', () => {
      // All stats equal — perfectly balanced
      const pet = createElderPet({
        hunger: 75, happiness: 75, energy: 75, hygiene: 75,
        health: 75, bond: 75, discipline: 75,
      });
      const result = system.determineLegacyTrait(pet);
      expect(result.trait.id).toBe('balanced_nature');
      expect(result.qualifyingStatValue).toBeNull();
    });

    it('selects happy_spirit when happiness is the highest qualifying stat', () => {
      const pet = createElderPet({
        happiness: 95,
        bond: 50,
        health: 50,
        discipline: 30,
        energy: 40,
        hunger: 40,
        hygiene: 40,
      });
      const result = system.determineLegacyTrait(pet);
      expect(result.trait.id).toBe('happy_spirit');
      expect(result.qualifyingStatValue).toBe(95);
    });

    it('selects iron_will when discipline is the highest qualifying stat', () => {
      const pet = createElderPet({
        discipline: 90,
        happiness: 50,
        bond: 50,
        health: 50,
        energy: 40,
        hunger: 40,
        hygiene: 40,
      });
      const result = system.determineLegacyTrait(pet);
      expect(result.trait.id).toBe('iron_will');
      expect(result.qualifyingStatValue).toBe(90);
    });

    it('selects social_heart when bond is the highest qualifying stat', () => {
      const pet = createElderPet({
        bond: 92,
        happiness: 50,
        discipline: 50,
        health: 50,
        energy: 40,
        hunger: 40,
        hygiene: 40,
      });
      const result = system.determineLegacyTrait(pet);
      expect(result.trait.id).toBe('social_heart');
    });

    it('selects vitality when health is the highest qualifying stat', () => {
      const pet = createElderPet({
        health: 95,
        happiness: 50,
        discipline: 50,
        bond: 50,
        energy: 40,
        hunger: 40,
        hygiene: 40,
      });
      const result = system.determineLegacyTrait(pet);
      expect(result.trait.id).toBe('vitality');
    });

    it('falls back to balanced_nature when no stat meets the minimum threshold', () => {
      const pet = createElderPet({
        hunger: 30, happiness: 20, energy: 25, hygiene: 10,
        health: 15, bond: 35, discipline: 10,
      });
      const result = system.determineLegacyTrait(pet);
      expect(result.trait.id).toBe('balanced_nature');
      expect(result.qualifyingStatValue).toBeNull();
    });
  });

  describe('createLegacyEgg', () => {
    it('creates an egg with the correct trait for the pet', () => {
      const pet = createElderPet({
        happiness: 95,
        bond: 40, health: 40, discipline: 30,
        energy: 40, hunger: 40, hygiene: 40,
      });
      const now = 999999;
      const egg = system.createLegacyEgg(pet, now);

      expect(egg.legacyTrait.id).toBe('happy_spirit');
      expect(egg.ancestorName).toBe('TestElder');
      expect(egg.elementType).toBe('fire');
      expect(egg.createdAt).toBe(now);
    });

    it('includes the ancestor name and element in the egg', () => {
      const pet = createElderPet();
      const egg = system.createLegacyEgg(pet, 12345);

      expect(egg.ancestorName).toBe('TestElder');
      expect(egg.elementType).toBe('fire');
    });

    it('generates a unique id based on pet name and timestamp', () => {
      const pet = createElderPet();
      const egg1 = system.createLegacyEgg(pet, 100);
      const egg2 = system.createLegacyEgg(pet, 200);

      expect(egg1.id).not.toBe(egg2.id);
    });
  });

  describe('applyLegacyBonus', () => {
    it('applies stat bonuses to the new pet stats', () => {
      const baseStats: PetState['stats'] = {
        hunger: 50, happiness: 50, energy: 50,
        hygiene: 50, health: 50, bond: 50, discipline: 50,
      };
      const bonus = LEGACY_TRAITS.happy_spirit.bonus;
      const result = system.applyLegacyBonus(baseStats, bonus);

      expect(result.happiness).toBe(60); // 50 + 10
      expect(result.bond).toBe(55);      // 50 + 5
      expect(result.health).toBe(50);    // unchanged
    });

    it('clamps bonuses to a maximum of 100', () => {
      const baseStats: PetState['stats'] = {
        hunger: 95, happiness: 95, energy: 95,
        hygiene: 95, health: 95, bond: 95, discipline: 95,
      };
      const bonus = LEGACY_TRAITS.happy_spirit.bonus; // happiness +10, bond +5
      const result = system.applyLegacyBonus(baseStats, bonus);

      expect(result.happiness).toBe(100);
      expect(result.bond).toBe(100);
    });

    it('does not modify the original stats object', () => {
      const baseStats: PetState['stats'] = {
        hunger: 50, happiness: 50, energy: 50,
        hygiene: 50, health: 50, bond: 50, discipline: 50,
      };
      system.applyLegacyBonus(baseStats, LEGACY_TRAITS.happy_spirit.bonus);
      expect(baseStats.happiness).toBe(50); // unchanged
    });

    it('applies multi-stat bonuses from balanced_nature', () => {
      const baseStats: PetState['stats'] = {
        hunger: 50, happiness: 50, energy: 50,
        hygiene: 50, health: 50, bond: 50, discipline: 50,
      };
      const bonus = LEGACY_TRAITS.balanced_nature.bonus;
      const result = system.applyLegacyBonus(baseStats, bonus);

      expect(result.happiness).toBe(55);
      expect(result.health).toBe(55);
      expect(result.bond).toBe(55);
      expect(result.energy).toBe(55);
      expect(result.discipline).toBe(50); // not in balanced_nature bonus
    });
  });

  describe('buildFamilyTreeEntry', () => {
    it('creates a valid family tree entry for the retiring pet', () => {
      const pet = createElderPet({
        happiness: 90, bond: 40, health: 40, discipline: 30,
        energy: 40, hunger: 40, hygiene: 40,
      });
      const now = 5000;
      const entry = system.buildFamilyTreeEntry(pet, null, now);

      expect(entry.name).toBe('TestElder');
      expect(entry.elementType).toBe('fire');
      expect(entry.evolutionPath).toBe('ember_drake');
      expect(entry.birthTimestamp).toBe(1000);
      expect(entry.retiredTimestamp).toBe(now);
      expect(entry.parentId).toBeNull();
      expect(entry.legacyTrait).toBe('happy_spirit');
    });

    it('includes parent reference when provided', () => {
      const pet = createElderPet();
      const entry = system.buildFamilyTreeEntry(pet, 'ancestor_pet_999', 1000);
      expect(entry.parentId).toBe('ancestor_pet_999');
    });
  });

  describe('retirePet', () => {
    it('adds the pet to the family tree and returns a legacy egg', () => {
      const save = createSaveWithElderPet({
        happiness: 90, bond: 40, health: 40, discipline: 30,
        energy: 40, hunger: 40, hygiene: 40,
      });
      const now = 9000;
      const egg = system.retirePet(save, null, now);

      expect(egg).not.toBeNull();
      expect(egg!.ancestorName).toBe('TestElder');
      expect(save.familyTree).toHaveLength(1);
      expect(save.familyTree[0].name).toBe('TestElder');
      expect(save.familyTree[0].retiredTimestamp).toBe(now);
    });

    it('returns null when there is no pet', () => {
      const save = createDefaultSave();
      expect(save.pet).toBeNull();
      const egg = system.retirePet(save);
      expect(egg).toBeNull();
    });

    it('returns null when the pet is not an Elder', () => {
      const save = createSaveWithElderPet();
      save.pet!.lifeStage = LifeStage.Adult;
      const egg = system.retirePet(save);
      expect(egg).toBeNull();
      expect(save.familyTree).toHaveLength(0);
    });

    it('accumulates multiple entries across generations', () => {
      const save = createDefaultSave();

      save.pet = createElderPet({ happiness: 90, bond: 40, health: 40, discipline: 30, energy: 40, hunger: 40, hygiene: 40 });
      system.retirePet(save, null, 1000);

      save.pet = createElderPet({ discipline: 90, happiness: 50, bond: 50, health: 50, energy: 40, hunger: 40, hygiene: 40 });
      save.pet.name = 'Generation2';
      system.retirePet(save, null, 2000);

      expect(save.familyTree).toHaveLength(2);
      expect(save.familyTree[0].name).toBe('TestElder');
      expect(save.familyTree[1].name).toBe('Generation2');
    });
  });

  describe('getFamilyTree', () => {
    it('returns a copy of the family tree', () => {
      const save = createSaveWithElderPet();
      system.retirePet(save, null, 1000);

      const tree = system.getFamilyTree(save);
      expect(tree).toHaveLength(1);
      // Ensure it's a copy, not the same reference
      tree.push({} as any);
      expect(save.familyTree).toHaveLength(1);
    });
  });

  describe('findParent', () => {
    it('finds a family tree entry by petId', () => {
      const save = createSaveWithElderPet();
      system.retirePet(save, null, 1000);

      const entry = save.familyTree[0];
      const found = system.findParent(save, entry.petId);
      expect(found).toBeDefined();
      expect(found!.name).toBe('TestElder');
    });

    it('returns undefined when petId does not exist', () => {
      const save = createDefaultSave();
      const found = system.findParent(save, 'nonexistent');
      expect(found).toBeUndefined();
    });
  });
});
