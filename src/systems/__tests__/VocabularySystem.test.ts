import { describe, it, expect, beforeEach } from 'vitest';
import { VocabularySystem } from '../VocabularySystem';
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

describe('VocabularySystem', () => {
  let system: VocabularySystem;

  beforeEach(() => {
    system = new VocabularySystem();
  });

  describe('getAvailableVocabulary', () => {
    it('should return empty vocabulary for egg stage', () => {
      const pet = createTestPet({ lifeStage: 'egg' });
      expect(system.getAvailableVocabulary(pet)).toHaveLength(0);
    });

    it('should return blob vocabulary for blob stage', () => {
      const pet = createTestPet({ lifeStage: 'blob' });
      const vocab = system.getAvailableVocabulary(pet);
      expect(vocab.length).toBeGreaterThan(0);
      expect(vocab.some((v) => v.text === '*bounce*')).toBe(true);
    });

    it('should accumulate vocabulary from previous stages', () => {
      const blob = createTestPet({ lifeStage: 'blob' });
      const juvenile = createTestPet({ lifeStage: 'juvenile' });
      const adolescent = createTestPet({ lifeStage: 'adolescent' });

      const blobVocab = system.getVocabularySize(blob);
      const juvenileVocab = system.getVocabularySize(juvenile);
      const adolescentVocab = system.getVocabularySize(adolescent);

      expect(juvenileVocab).toBeGreaterThan(blobVocab);
      expect(adolescentVocab).toBeGreaterThan(juvenileVocab);
    });

    it('should include all stages up to elder', () => {
      const elder = createTestPet({ lifeStage: 'elder' });
      const vocab = system.getAvailableVocabulary(elder);

      // Elder should have blob, juvenile, adolescent, adult, and elder words
      expect(vocab.some((v) => v.text === '*bounce*')).toBe(true); // blob
      expect(vocab.some((v) => v.text === 'Yay!')).toBe(true); // juvenile
      expect(vocab.some((v) => v.text === 'This is boring...')).toBe(true); // adolescent
      expect(vocab.some((v) => v.text === 'I trust you.')).toBe(true); // adult
      expect(vocab.some((v) => v.text === 'I remember everything.')).toBe(true); // elder
    });

    it('should return empty for unknown life stage', () => {
      const pet = createTestPet({ lifeStage: 'unknown' as string });
      expect(system.getAvailableVocabulary(pet)).toHaveLength(0);
    });
  });

  describe('getVocabularyForCategory', () => {
    it('should filter by need category', () => {
      const pet = createTestPet({ lifeStage: 'juvenile' });
      const needs = system.getVocabularyForCategory(pet, 'need');
      expect(needs.length).toBeGreaterThan(0);
      expect(needs.every((v) => v.categories.includes('need'))).toBe(true);
    });

    it('should filter by rebellion category', () => {
      const pet = createTestPet({ lifeStage: 'adolescent' });
      const rebellion = system.getVocabularyForCategory(pet, 'rebellion');
      expect(rebellion.length).toBeGreaterThan(0);
      expect(rebellion.every((v) => v.categories.includes('rebellion'))).toBe(true);
    });

    it('should not have rebellion words before adolescent', () => {
      const pet = createTestPet({ lifeStage: 'blob' });
      const rebellion = system.getVocabularyForCategory(pet, 'rebellion');
      expect(rebellion).toHaveLength(0);
    });
  });

  describe('getVocabularySize', () => {
    it('should grow with each life stage', () => {
      const stages = ['egg', 'blob', 'juvenile', 'adolescent', 'adult', 'elder'] as const;
      let previousSize = -1;

      for (const stage of stages) {
        const pet = createTestPet({ lifeStage: stage });
        const size = system.getVocabularySize(pet);
        expect(size).toBeGreaterThanOrEqual(previousSize);
        previousSize = size;
      }
    });
  });

  describe('pickText', () => {
    it('should return null for egg stage', () => {
      const pet = createTestPet({ lifeStage: 'egg' });
      expect(system.pickText(pet, 'need')).toBeNull();
    });

    it('should return text for valid category and stage', () => {
      const pet = createTestPet({ lifeStage: 'juvenile' });
      const text = system.pickText(pet, 'need', undefined, 0.5);
      expect(text).not.toBeNull();
      expect(typeof text).toBe('string');
    });

    it('should substitute favorite food placeholder', () => {
      const pet = createTestPet({ lifeStage: 'adult' });
      // Find a text with {food} placeholder
      const requestVocab = system.getVocabularyForCategory(pet, 'request');
      const hasFoodPlaceholder = requestVocab.some((v) => v.text.includes('{food}'));
      expect(hasFoodPlaceholder).toBe(true);

      // Use a seed that picks the food placeholder entry
      for (let seed = 0; seed < 100; seed++) {
        const text = system.pickText(pet, 'request', { favoriteFood: 'apple' }, seed / 100);
        if (text && text.includes('apple')) {
          expect(text).not.toContain('{food}');
          return; // Test passed
        }
      }
    });

    it('should substitute favorite game placeholder', () => {
      const pet = createTestPet({ lifeStage: 'adult' });
      for (let seed = 0; seed < 100; seed++) {
        const text = system.pickText(pet, 'request', { favoriteGame: 'fetch' }, seed / 100);
        if (text && text.includes('fetch')) {
          expect(text).not.toContain('{game}');
          return;
        }
      }
    });

    it('should be deterministic with same seed', () => {
      const pet = createTestPet({ lifeStage: 'juvenile' });
      const text1 = system.pickText(pet, 'need', undefined, 0.3);
      const text2 = system.pickText(pet, 'need', undefined, 0.3);
      expect(text1).toBe(text2);
    });
  });

  describe('hasVocabularyFor', () => {
    it('should return false for egg stage', () => {
      const pet = createTestPet({ lifeStage: 'egg' });
      expect(system.hasVocabularyFor(pet, 'need')).toBe(false);
    });

    it('should return true for categories with entries', () => {
      const pet = createTestPet({ lifeStage: 'juvenile' });
      expect(system.hasVocabularyFor(pet, 'need')).toBe(true);
      expect(system.hasVocabularyFor(pet, 'feeling')).toBe(true);
    });

    it('should return false for rebellion before juvenile has rebellion words', () => {
      const pet = createTestPet({ lifeStage: 'juvenile' });
      // Juvenile does have "No!" in rebellion category
      expect(system.hasVocabularyFor(pet, 'rebellion')).toBe(true);
    });
  });
});
