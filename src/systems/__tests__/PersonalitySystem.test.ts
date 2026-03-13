import { describe, it, expect, beforeEach } from 'vitest';
import { PersonalitySystem } from '../PersonalitySystem';
import type { PetState } from '../../data/SaveSchema';
import { createDefaultMoodState, createDefaultCommunicationState } from '../../data/SaveSchema';

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
      personality: [0.5, 0.5, 0.5, 0.5],
      trust: 50,
      stress: 30,
    },
    illness: { type: null, startTimestamp: null },
    evolutionPath: null,
    birthTimestamp: Date.now() - 86400000,
    stageStartTimestamp: Date.now() - 43200000,
    careHistory: {
      happinessAvg: 50,
      disciplineRatio: 0.5,
      uniqueFoodsCount: 0,
      activitiesCompleted: 0,
      bondAvg: 50,
      secretFlags: {},
    },
    training: {
      sessionsToday: 0,
      lastSessionTimestamp: 0,
      fatigue: 0,
      skills: { obedience: 0, tricks: 0, agility: 0 },
    },
    hygieneCare: {
      dirtLevel: 0,
      bathPhase: 'idle',
      bathProgress: 0,
      groomed: false,
      lastBathTimestamp: 0,
    },
    sleep: {
      phase: 'awake',
      sleepStartTimestamp: 0,
      nightlightOn: false,
      dreamMood: null,
      wasForced: false,
    },
    mood: createDefaultMoodState(),
    communication: createDefaultCommunicationState(),
    ...overrides,
  };
}

describe('PersonalitySystem', () => {
  let system: PersonalitySystem;

  beforeEach(() => {
    system = new PersonalitySystem();
  });

  describe('getQuirks', () => {
    it('should detect mischievous quirk for high playful', () => {
      const pet = createTestPet({
        hiddenStats: { personality: [0.8, 0.5, 0.5, 0.5], trust: 50, stress: 30 },
      });
      const quirks = system.getActiveQuirks(pet);
      expect(quirks).toContain('mischievous');
    });

    it('should detect timid quirk for low brave', () => {
      const pet = createTestPet({
        hiddenStats: { personality: [0.5, 0.2, 0.5, 0.5], trust: 50, stress: 30 },
      });
      expect(system.hasQuirk(pet, 'timid')).toBe(true);
    });

    it('should detect brave quirk for high brave', () => {
      const pet = createTestPet({
        hiddenStats: { personality: [0.5, 0.8, 0.5, 0.5], trust: 50, stress: 30 },
      });
      expect(system.hasQuirk(pet, 'brave')).toBe(true);
    });

    it('should detect scholar quirk for high smart', () => {
      const pet = createTestPet({
        hiddenStats: { personality: [0.5, 0.5, 0.5, 0.8], trust: 50, stress: 30 },
      });
      expect(system.hasQuirk(pet, 'scholar')).toBe(true);
    });

    it('should detect glutton quirk for low gentle', () => {
      const pet = createTestPet({
        hiddenStats: { personality: [0.5, 0.5, 0.2, 0.5], trust: 50, stress: 30 },
      });
      expect(system.hasQuirk(pet, 'glutton')).toBe(true);
    });

    it('should detect social quirk for high gentle', () => {
      const pet = createTestPet({
        hiddenStats: { personality: [0.5, 0.5, 0.8, 0.5], trust: 50, stress: 30 },
      });
      expect(system.hasQuirk(pet, 'social')).toBe(true);
    });

    it('should not detect quirks for mid-range personality', () => {
      const pet = createTestPet({
        hiddenStats: { personality: [0.5, 0.5, 0.5, 0.5], trust: 50, stress: 30 },
      });
      const quirks = system.getActiveQuirks(pet);
      expect(quirks).toHaveLength(0);
    });

    it('should detect multiple quirks simultaneously', () => {
      const pet = createTestPet({
        hiddenStats: { personality: [0.8, 0.8, 0.5, 0.8], trust: 50, stress: 30 },
      });
      const quirks = system.getActiveQuirks(pet);
      expect(quirks).toContain('mischievous');
      expect(quirks).toContain('brave');
      expect(quirks).toContain('scholar');
    });
  });

  describe('rebellion', () => {
    it('should only trigger during adolescent stage', () => {
      const pet = createTestPet({ lifeStage: 'juvenile' });
      expect(system.isInRebellionPhase(pet)).toBe(false);
      expect(system.checkRebellion(pet, 0).rebelled).toBe(false);
    });

    it('should detect rebellion phase for adolescent', () => {
      const pet = createTestPet({ lifeStage: 'adolescent' });
      expect(system.isInRebellionPhase(pet)).toBe(true);
    });

    it('should rebel with low discipline and low roll', () => {
      const pet = createTestPet({
        lifeStage: 'adolescent',
        stats: {
          hunger: 50, happiness: 50, energy: 50, hygiene: 50,
          health: 50, bond: 50, discipline: 10,
        },
      });
      // With discipline=10: chance = 0.2 * (1 - 0.1*0.6) = 0.2 * 0.94 = 0.188
      const result = system.checkRebellion(pet, 0.1);
      expect(result.rebelled).toBe(true);
      expect(result.bubble).not.toBeNull();
    });

    it('should not rebel with high discipline', () => {
      const pet = createTestPet({
        lifeStage: 'adolescent',
        stats: {
          hunger: 50, happiness: 50, energy: 50, hygiene: 50,
          health: 50, bond: 50, discipline: 100,
        },
      });
      // With discipline=100: chance = 0.2 * (1 - 1*0.6) = 0.2 * 0.4 = 0.08
      const result = system.checkRebellion(pet, 0.1);
      expect(result.rebelled).toBe(false);
    });

    it('should not rebel with high roll', () => {
      const pet = createTestPet({
        lifeStage: 'adolescent',
        stats: {
          hunger: 50, happiness: 50, energy: 50, hygiene: 50,
          health: 50, bond: 50, discipline: 10,
        },
      });
      const result = system.checkRebellion(pet, 0.9);
      expect(result.rebelled).toBe(false);
    });

    it('should return rebellion chance of 0 outside adolescence', () => {
      const pet = createTestPet({ lifeStage: 'adult' });
      expect(system.getRebellionChance(pet)).toBe(0);
    });
  });

  describe('affection', () => {
    it('should not express affection with low bond', () => {
      const pet = createTestPet();
      pet.stats.bond = 40;
      const result = system.checkAffection(pet, 0);
      expect(result.expressed).toBe(false);
    });

    it('should not express affection with low trust', () => {
      const pet = createTestPet({
        hiddenStats: { personality: [0.5, 0.5, 0.5, 0.5], trust: 30, stress: 30 },
      });
      pet.stats.bond = 80;
      const result = system.checkAffection(pet, 0);
      expect(result.expressed).toBe(false);
    });

    it('should express affection with high bond and trust on low roll', () => {
      const pet = createTestPet({
        hiddenStats: { personality: [0.5, 0.5, 0.5, 0.5], trust: 70, stress: 30 },
      });
      pet.stats.bond = 80;
      const result = system.checkAffection(pet, 0.1);
      expect(result.expressed).toBe(true);
      expect(result.bubble).not.toBeNull();
      expect(result.bubble!.category).toBe('affection');
    });

    it('should not express affection on high roll even with high stats', () => {
      const pet = createTestPet({
        hiddenStats: { personality: [0.5, 0.5, 0.5, 0.5], trust: 70, stress: 30 },
      });
      pet.stats.bond = 80;
      const result = system.checkAffection(pet, 0.9);
      expect(result.expressed).toBe(false);
    });
  });

  describe('quirk multipliers', () => {
    it('should give training bonus for scholar', () => {
      const scholar = createTestPet({
        hiddenStats: { personality: [0.5, 0.5, 0.5, 0.8], trust: 50, stress: 30 },
      });
      expect(system.getTrainingMultiplier(scholar)).toBe(1.25);

      const normal = createTestPet();
      expect(system.getTrainingMultiplier(normal)).toBe(1.0);
    });

    it('should give exploration bonus for brave', () => {
      const brave = createTestPet({
        hiddenStats: { personality: [0.5, 0.8, 0.5, 0.5], trust: 50, stress: 30 },
      });
      expect(system.getExplorationLootMultiplier(brave)).toBe(1.3);
    });

    it('should increase communication frequency for social', () => {
      const social = createTestPet({
        hiddenStats: { personality: [0.5, 0.5, 0.8, 0.5], trust: 50, stress: 30 },
      });
      expect(system.getCommunicationFrequencyMultiplier(social)).toBeLessThan(1.0);
    });

    it('should reduce bond decay for social', () => {
      const social = createTestPet({
        hiddenStats: { personality: [0.5, 0.5, 0.8, 0.5], trust: 50, stress: 30 },
      });
      expect(system.getBondDecayMultiplier(social)).toBeLessThan(1.0);
    });

    it('should increase fullness decay for glutton', () => {
      const glutton = createTestPet({
        hiddenStats: { personality: [0.5, 0.5, 0.2, 0.5], trust: 50, stress: 30 },
      });
      expect(system.getFullnessDecayMultiplier(glutton)).toBeGreaterThan(1.0);
    });
  });

  describe('weather fear', () => {
    it('should scare timid pets during storms', () => {
      const timid = createTestPet({
        hiddenStats: { personality: [0.5, 0.2, 0.5, 0.5], trust: 50, stress: 30 },
      });
      expect(system.isScaredByWeather(timid, 'stormy')).toBe(true);
      expect(system.isScaredByWeather(timid, 'rainy')).toBe(false);
    });

    it('should not scare brave pets during storms', () => {
      const brave = createTestPet({
        hiddenStats: { personality: [0.5, 0.8, 0.5, 0.5], trust: 50, stress: 30 },
      });
      expect(system.isScaredByWeather(brave, 'stormy')).toBe(false);
    });
  });

  describe('mischief', () => {
    it('should only trigger for mischievous pets', () => {
      const normal = createTestPet();
      expect(system.checkMischief(normal, 0.01)).toBe(false);

      const mischievous = createTestPet({
        hiddenStats: { personality: [0.8, 0.5, 0.5, 0.5], trust: 50, stress: 30 },
      });
      expect(system.checkMischief(mischievous, 0.01)).toBe(true);
    });

    it('should not trigger on high rolls', () => {
      const mischievous = createTestPet({
        hiddenStats: { personality: [0.8, 0.5, 0.5, 0.5], trust: 50, stress: 30 },
      });
      expect(system.checkMischief(mischievous, 0.5)).toBe(false);
    });
  });
});
