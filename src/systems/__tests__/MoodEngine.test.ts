import { describe, it, expect, beforeEach } from 'vitest';
import { MoodEngine } from '../MoodEngine';
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

describe('MoodEngine', () => {
  let engine: MoodEngine;
  let pet: PetState;

  beforeEach(() => {
    engine = new MoodEngine();
    pet = createTestPet();
  });

  describe('recordEvent', () => {
    it('should add event to memory', () => {
      engine.recordEvent(pet, 'fed_loved', 'apple');
      expect(pet.communication.memory.length).toBe(1);
      expect(pet.communication.memory[0].type).toBe('fed_loved');
      expect(pet.communication.memory[0].details).toBe('apple');
    });

    it('should apply mood effects from event', () => {
      engine.recordEvent(pet, 'fed_loved');
      const happyIntensity = engine.getMoodIntensity(pet, 'happy');
      expect(happyIntensity).toBeGreaterThan(0);
    });

    it('should reduce opposing moods', () => {
      // First make the pet grumpy
      engine.recordEvent(pet, 'fed_disliked');
      const grumpyBefore = engine.getMoodIntensity(pet, 'grumpy');
      expect(grumpyBefore).toBeGreaterThan(0);

      // Now feed loved food which reduces grumpy
      engine.recordEvent(pet, 'fed_loved');
      const grumpyAfter = engine.getMoodIntensity(pet, 'grumpy');
      expect(grumpyAfter).toBeLessThan(grumpyBefore);
    });

    it('should trim memory to max size', () => {
      for (let i = 0; i < 25; i++) {
        engine.recordEvent(pet, 'played_game');
      }
      expect(pet.communication.memory.length).toBe(20);
    });

    it('should update dominant mood after event', () => {
      engine.recordEvent(pet, 'played_game'); // playful: 30
      expect(pet.mood.dominantMood).toBe('playful');
    });
  });

  describe('tick', () => {
    it('should decay moods over time', () => {
      engine.recordEvent(pet, 'played_game'); // playful: 30
      const before = engine.getMoodIntensity(pet, 'playful');

      engine.tick(pet, 100); // 100 seconds
      const after = engine.getMoodIntensity(pet, 'playful');

      expect(after).toBeLessThan(before);
    });

    it('should apply stat-based mood influences', () => {
      pet.stats.happiness = 80; // above 70 → happy mood influence
      engine.tick(pet, 1000); // Long tick to accumulate

      const happyIntensity = engine.getMoodIntensity(pet, 'happy');
      expect(happyIntensity).toBeGreaterThan(0);
    });

    it('should make grumpy mood from low hunger', () => {
      pet.stats.hunger = 20;
      engine.tick(pet, 1000);

      const grumpyIntensity = engine.getMoodIntensity(pet, 'grumpy');
      expect(grumpyIntensity).toBeGreaterThan(0);
    });

    it('should prune fully decayed moods', () => {
      engine.recordEvent(pet, 'played_game');
      expect(pet.mood.moods.length).toBeGreaterThan(0);

      // Tick a very long time to fully decay
      engine.tick(pet, 10000);
      // Playful mood should be pruned (intensity near 0)
      const playful = pet.mood.moods.find((m) => m.mood === 'playful');
      expect(playful).toBeUndefined();
    });

    it('should clear dominant mood when all moods decay below threshold', () => {
      engine.recordEvent(pet, 'played_game');
      expect(pet.mood.dominantMood).toBe('playful');

      engine.tick(pet, 10000);
      // After long decay, dominant should be null (or stat-influenced)
      const playfulIntensity = engine.getMoodIntensity(pet, 'playful');
      if (playfulIntensity < 15) {
        // playful threshold is 15
        expect(pet.mood.dominantMood).not.toBe('playful');
      }
    });
  });

  describe('getDominantMood', () => {
    it('should return null when no moods are active', () => {
      expect(engine.getDominantMood(pet)).toBeNull();
    });

    it('should return the highest intensity mood above threshold', () => {
      engine.recordEvent(pet, 'played_game'); // playful: 30
      engine.recordEvent(pet, 'fed_disliked'); // grumpy: 20

      const dominant = engine.getDominantMood(pet);
      expect(dominant).toBe('playful');
    });
  });

  describe('getActiveMoods', () => {
    it('should return empty array when no moods are above threshold', () => {
      expect(engine.getActiveMoods(pet)).toHaveLength(0);
    });

    it('should return moods sorted by intensity', () => {
      engine.recordEvent(pet, 'played_game'); // playful: 30, happy: 15
      engine.recordEvent(pet, 'fed_disliked'); // grumpy: 20

      const active = engine.getActiveMoods(pet);
      expect(active.length).toBeGreaterThan(0);
      // Should be sorted highest first
      for (let i = 1; i < active.length; i++) {
        expect(active[i - 1].intensity).toBeGreaterThanOrEqual(active[i].intensity);
      }
    });
  });

  describe('memory queries', () => {
    it('should count recent events by type', () => {
      engine.recordEvent(pet, 'played_game');
      engine.recordEvent(pet, 'played_game');
      engine.recordEvent(pet, 'fed_loved');

      expect(engine.countRecentEvents(pet, 'played_game')).toBe(2);
      expect(engine.countRecentEvents(pet, 'fed_loved')).toBe(1);
      expect(engine.countRecentEvents(pet, 'trained')).toBe(0);
    });

    it('should check for recent event existence', () => {
      engine.recordEvent(pet, 'got_sick');
      expect(engine.hasRecentEvent(pet, 'got_sick')).toBe(true);
      expect(engine.hasRecentEvent(pet, 'healed')).toBe(false);
    });

    it('should filter events by time window', () => {
      // Add an old event
      pet.communication.memory.push({
        type: 'played_game',
        timestamp: Date.now() - 5 * 60 * 60 * 1000, // 5 hours ago
      });

      // Add a recent event
      engine.recordEvent(pet, 'fed_loved');

      const recent = engine.getRecentEvents(pet, 60 * 60 * 1000); // 1 hour
      expect(recent.length).toBe(1);
      expect(recent[0].type).toBe('fed_loved');
    });
  });
});
