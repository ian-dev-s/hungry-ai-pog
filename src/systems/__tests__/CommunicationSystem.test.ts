import { describe, it, expect, beforeEach } from 'vitest';
import { CommunicationSystem } from '../CommunicationSystem';
import { MoodEngine } from '../MoodEngine';
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

describe('CommunicationSystem', () => {
  let moodEngine: MoodEngine;
  let personalitySystem: PersonalitySystem;
  let commSystem: CommunicationSystem;
  let pet: PetState;

  beforeEach(() => {
    moodEngine = new MoodEngine();
    personalitySystem = new PersonalitySystem();
    commSystem = new CommunicationSystem(moodEngine, personalitySystem);
    pet = createTestPet();
  });

  describe('talkToPet', () => {
    it('should boost bond, happiness, and reduce stress', () => {
      const bondBefore = pet.stats.bond;
      const happinessBefore = pet.stats.happiness;
      const stressBefore = pet.hiddenStats.stress;

      const result = commSystem.talkToPet(pet, Date.now());

      expect(result.success).toBe(true);
      expect(pet.stats.bond).toBeGreaterThan(bondBefore);
      expect(pet.stats.happiness).toBeGreaterThan(happinessBefore);
      expect(pet.hiddenStats.stress).toBeLessThan(stressBefore);
    });

    it('should record talked_to event in memory', () => {
      commSystem.talkToPet(pet, Date.now());
      expect(pet.communication.memory.some((e) => e.type === 'talked_to')).toBe(true);
    });

    it('should respect talk cooldown', () => {
      const now = Date.now();
      const first = commSystem.talkToPet(pet, now);
      expect(first.success).toBe(true);

      const second = commSystem.talkToPet(pet, now + 10000); // 10 seconds later
      expect(second.success).toBe(false);
      expect(second.reason).toBeDefined();
    });

    it('should allow talking after cooldown expires', () => {
      const now = Date.now();
      commSystem.talkToPet(pet, now);

      const afterCooldown = commSystem.talkToPet(pet, now + 61000); // 61 seconds later
      expect(afterCooldown.success).toBe(true);
    });

    it('should clamp stats to bounds', () => {
      pet.stats.bond = 98;
      pet.stats.happiness = 99;
      pet.hiddenStats.stress = 2;

      commSystem.talkToPet(pet, Date.now());

      expect(pet.stats.bond).toBeLessThanOrEqual(100);
      expect(pet.stats.happiness).toBeLessThanOrEqual(100);
      expect(pet.hiddenStats.stress).toBeGreaterThanOrEqual(0);
    });
  });

  describe('canTalk', () => {
    it('should return true when no recent talk', () => {
      expect(commSystem.canTalk(pet, Date.now())).toBe(true);
    });

    it('should return false during cooldown', () => {
      const now = Date.now();
      commSystem.talkToPet(pet, now);
      expect(commSystem.canTalk(pet, now + 30000)).toBe(false);
    });

    it('should return true after cooldown', () => {
      const now = Date.now();
      commSystem.talkToPet(pet, now);
      expect(commSystem.canTalk(pet, now + 61000)).toBe(true);
    });
  });

  describe('getTalkCooldownRemaining', () => {
    it('should return 0 when no recent talk', () => {
      expect(commSystem.getTalkCooldownRemaining(pet, Date.now())).toBe(0);
    });

    it('should return remaining seconds during cooldown', () => {
      const now = Date.now();
      commSystem.talkToPet(pet, now);
      const remaining = commSystem.getTalkCooldownRemaining(pet, now + 30000);
      expect(remaining).toBeCloseTo(30, 0);
    });
  });

  describe('checkForBubble', () => {
    it('should not show bubble before interval', () => {
      const now = Date.now();
      pet.communication.lastBubbleTimestamp = now;
      pet.stats.hunger = 10; // Should trigger hungry bubble

      const bubble = commSystem.checkForBubble(pet, now + 60000); // 60s later
      expect(bubble).toBeNull();
    });

    it('should show hungry bubble when hunger is low', () => {
      const now = Date.now();
      pet.communication.lastBubbleTimestamp = now - 200000; // Long enough ago
      pet.stats.hunger = 10;

      const bubble = commSystem.checkForBubble(pet, now);
      expect(bubble).not.toBeNull();
      expect(bubble!.icon).toBe('🍖');
    });

    it('should show sick bubble when ill', () => {
      const now = Date.now();
      pet.communication.lastBubbleTimestamp = now - 200000;
      pet.illness = { type: 'cold', startTimestamp: now };

      const bubble = commSystem.checkForBubble(pet, now);
      expect(bubble).not.toBeNull();
      expect(bubble!.icon).toBe('🤒');
    });

    it('should prioritize higher priority bubbles', () => {
      const now = Date.now();
      pet.communication.lastBubbleTimestamp = now - 200000;
      pet.stats.hunger = 10; // hungry priority: 90
      pet.illness = { type: 'cold', startTimestamp: now }; // sick priority: 95

      const bubble = commSystem.checkForBubble(pet, now);
      expect(bubble).not.toBeNull();
      expect(bubble!.icon).toBe('🤒'); // Sick has higher priority
    });

    it('should show tired bubble when energy is low', () => {
      const now = Date.now();
      pet.communication.lastBubbleTimestamp = now - 200000;
      pet.stats.energy = 15;

      const bubble = commSystem.checkForBubble(pet, now);
      expect(bubble).not.toBeNull();
      expect(bubble!.icon).toBe('💤');
    });

    it('should show feeling bubbles from mood state', () => {
      const now = Date.now();
      pet.communication.lastBubbleTimestamp = now - 200000;
      // Trigger playful mood
      moodEngine.recordEvent(pet, 'played_game');

      const bubble = commSystem.checkForBubble(pet, now);
      expect(bubble).not.toBeNull();
    });

    it('should return null when pet has no needs or moods', () => {
      const now = Date.now();
      pet.communication.lastBubbleTimestamp = now - 200000;
      // All stats are at 50 (fine), no moods active

      const bubble = commSystem.checkForBubble(pet, now);
      expect(bubble).toBeNull();
    });

    it('should update lastBubbleTimestamp when showing bubble', () => {
      const now = Date.now();
      pet.communication.lastBubbleTimestamp = now - 200000;
      pet.stats.hunger = 10;

      commSystem.checkForBubble(pet, now);
      expect(pet.communication.lastBubbleTimestamp).toBe(now);
    });
  });

  describe('getCandidateBubbles', () => {
    it('should return all applicable bubbles', () => {
      pet.stats.hunger = 10;
      pet.stats.energy = 15;

      const bubbles = commSystem.getCandidateBubbles(pet);
      expect(bubbles.length).toBeGreaterThanOrEqual(2);
      expect(bubbles.some((b) => b.icon === '🍖')).toBe(true);
      expect(bubbles.some((b) => b.icon === '💤')).toBe(true);
    });

    it('should include request bubbles from memory', () => {
      pet.stats.hunger = 40; // Below 50 triggers food request
      // Add food memory
      pet.communication.memory.push(
        { type: 'fed_loved', timestamp: Date.now(), details: 'apple' },
        { type: 'fed_loved', timestamp: Date.now(), details: 'apple' },
      );

      const bubbles = commSystem.getCandidateBubbles(pet);
      const foodRequest = bubbles.find((b) => b.text.includes('apple'));
      expect(foodRequest).toBeDefined();
    });
  });

  describe('vocabulary growth by life stage', () => {
    it('should use juvenile vocabulary for juvenile pets', () => {
      pet.lifeStage = 'juvenile';
      pet.stats.hunger = 10;

      const bubbles = commSystem.getCandidateBubbles(pet);
      const hungryBubble = bubbles.find((b) => b.icon === '🍖');
      expect(hungryBubble).toBeDefined();
      expect(hungryBubble!.text).toBe('Food!');
    });

    it('should use adolescent vocabulary for adolescent pets', () => {
      pet.lifeStage = 'adolescent';
      pet.stats.hunger = 10;

      const bubbles = commSystem.getCandidateBubbles(pet);
      const hungryBubble = bubbles.find((b) => b.icon === '🍖');
      expect(hungryBubble).toBeDefined();
      expect(hungryBubble!.text).toBe('Hungry...');
    });

    it('should use adult vocabulary for adult pets', () => {
      pet.lifeStage = 'adult';
      pet.stats.hunger = 10;

      const bubbles = commSystem.getCandidateBubbles(pet);
      const hungryBubble = bubbles.find((b) => b.icon === '🍖');
      expect(hungryBubble).toBeDefined();
      expect(hungryBubble!.text).toBe("I'm getting hungry!");
    });

    it('should use elder vocabulary for elder pets', () => {
      pet.lifeStage = 'elder';
      pet.stats.hunger = 10;

      const bubbles = commSystem.getCandidateBubbles(pet);
      const hungryBubble = bubbles.find((b) => b.icon === '🍖');
      expect(hungryBubble).toBeDefined();
      expect(hungryBubble!.text).toBe('A nice meal would be lovely.');
    });

    it('should use minimal vocabulary for egg stage', () => {
      pet.lifeStage = 'egg';
      pet.stats.hunger = 10;

      const bubbles = commSystem.getCandidateBubbles(pet);
      const hungryBubble = bubbles.find((b) => b.icon === '🍖');
      expect(hungryBubble).toBeDefined();
      expect(hungryBubble!.text).toBe('...');
    });

    it('should adapt feeling bubbles to life stage', () => {
      pet.lifeStage = 'adult';
      // Trigger playful mood
      moodEngine.recordEvent(pet, 'played_game');
      moodEngine.recordEvent(pet, 'played_game');

      const bubbles = commSystem.getCandidateBubbles(pet);
      const playfulBubble = bubbles.find((b) => b.icon === '⭐');
      if (playfulBubble) {
        expect(playfulBubble.text).toBe("Let's do something fun!");
      }
    });

    it('should adapt request bubbles with food name to life stage', () => {
      pet.lifeStage = 'elder';
      pet.stats.hunger = 40;
      pet.communication.memory.push(
        { type: 'fed_loved', timestamp: Date.now(), details: 'apple' },
        { type: 'fed_loved', timestamp: Date.now(), details: 'apple' },
      );

      const bubbles = commSystem.getCandidateBubbles(pet);
      const foodRequest = bubbles.find((b) => b.text.includes('apple'));
      expect(foodRequest).toBeDefined();
      expect(foodRequest!.text).toBe("I'd love some apple, for old times' sake.");
    });

    it('should fall back to adult vocabulary for unknown life stages', () => {
      pet.lifeStage = 'unknown_stage';
      const stage = commSystem.getVocabStage(pet);
      expect(stage).toBe('adult');
    });
  });

  describe('social pet communication', () => {
    it('should communicate more frequently for social pets', () => {
      const socialPet = createTestPet({
        hiddenStats: { personality: [0.5, 0.5, 0.8, 0.5], trust: 50, stress: 30 },
      });
      socialPet.stats.hunger = 10;

      const now = Date.now();
      // Set last bubble 80 seconds ago (less than normal 120s interval)
      socialPet.communication.lastBubbleTimestamp = now - 80000;

      // Social pet (0.6 multiplier) needs 72s, so 80s should be enough
      const bubble = commSystem.checkForBubble(socialPet, now);
      expect(bubble).not.toBeNull();

      // Normal pet would not get a bubble at 80s
      const normalPet = createTestPet();
      normalPet.stats.hunger = 10;
      normalPet.communication.lastBubbleTimestamp = now - 80000;

      const normalBubble = commSystem.checkForBubble(normalPet, now);
      expect(normalBubble).toBeNull();
    });
  });
});
