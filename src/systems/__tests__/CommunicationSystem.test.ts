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

  describe('vocabulary growth', () => {
    it('should return only baby phrases for baby pets', () => {
      const babyPet = createTestPet({ lifeStage: 'baby' });
      const vocab = commSystem.getVocabulary(babyPet);

      // Baby tier only
      expect(vocab.need).toEqual(['...!', 'Wah!', 'Mm!']);
      expect(vocab.affection).toEqual(['~', '♡']);
    });

    it('should accumulate phrases for child pets (baby + child)', () => {
      const childPet = createTestPet({ lifeStage: 'child' });
      const vocab = commSystem.getVocabulary(childPet);

      // Baby + child tiers
      expect(vocab.need).toContain('...!'); // baby
      expect(vocab.need).toContain('Hungry...'); // child
      expect(vocab.need.length).toBe(6); // 3 baby + 3 child
    });

    it('should accumulate all tiers for adult pets', () => {
      const adultPet = createTestPet({ lifeStage: 'adult' });
      const vocab = commSystem.getVocabulary(adultPet);

      // baby + child + adolescent + adult
      expect(vocab.need).toContain('...!'); // baby
      expect(vocab.need).toContain('Hungry...'); // child
      expect(vocab.need).toContain("I'm starving!"); // adolescent
      expect(vocab.need).toContain('Could use a snack'); // adult
    });

    it('should include elder phrases for elder pets', () => {
      const elderPet = createTestPet({ lifeStage: 'elder' });
      const vocab = commSystem.getVocabulary(elderPet);

      expect(vocab.affection).toContain('All these years together...');
      expect(vocab.feeling).toContain('Ah, what a peaceful day');
    });

    it('should apply vocabulary to speech bubbles via checkForBubble', () => {
      const babyPet = createTestPet({ lifeStage: 'baby' });
      babyPet.communication.lastBubbleTimestamp = 0;
      babyPet.stats.hunger = 10;

      const vocab = commSystem.getVocabulary(babyPet);
      const bubble = commSystem.checkForBubble(babyPet, Date.now());

      expect(bubble).not.toBeNull();
      // The text should be from the baby vocabulary for need category
      expect(vocab.need).toContain(bubble!.text);
    });

    it('should use default (baby) vocabulary for unknown life stages', () => {
      const unknownPet = createTestPet({ lifeStage: 'egg' as string });
      const vocab = commSystem.getVocabulary(unknownPet);

      expect(vocab.need).toEqual(['...!', 'Wah!', 'Mm!']);
    });

    it('should have richer vocabulary for older pets', () => {
      const babyPet = createTestPet({ lifeStage: 'baby' });
      const elderPet = createTestPet({ lifeStage: 'elder' });

      const babyVocab = commSystem.getVocabulary(babyPet);
      const elderVocab = commSystem.getVocabulary(elderPet);

      for (const category of ['need', 'feeling', 'request', 'affection', 'rebellion'] as const) {
        expect(elderVocab[category].length).toBeGreaterThan(babyVocab[category].length);
      }
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
