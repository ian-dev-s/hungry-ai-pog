import { describe, it, expect, beforeEach } from 'vitest';
import { TrainingSystem } from '../TrainingSystem';
import {
  PetState,
  createDefaultTrainingState,
  createDefaultHygieneState,
  createDefaultSleepState,
} from '../../data/SaveSchema';
import {
  MAX_SESSIONS_PER_DAY,
  SESSION_COOLDOWN,
  OVERTRAINING_THRESHOLD,
  FATIGUE_PER_SESSION,
} from '../../data/TrainingConfig';

function createTestPet(overrides?: Partial<PetState>): PetState {
  return {
    name: 'TestPet',
    elementType: 'forest',
    lifeStage: 'adult',
    stats: {
      hunger: 80,
      happiness: 80,
      energy: 80,
      hygiene: 80,
      health: 80,
      bond: 80,
      discipline: 80,
    },
    hiddenStats: {
      personality: [0.5, 0.5, 0.5, 0.5],
      trust: 50,
      stress: 10,
    },
    evolutionPath: null,
    birthTimestamp: Date.now(),
    stageStartTimestamp: Date.now(),
    training: createDefaultTrainingState(),
    hygieneCare: createDefaultHygieneState(),
    sleep: createDefaultSleepState(),
    ...overrides,
  };
}

describe('TrainingSystem', () => {
  let system: TrainingSystem;
  const now = Date.now();

  beforeEach(() => {
    system = new TrainingSystem();
  });

  describe('canTrain', () => {
    it('allows training for adult pets', () => {
      const pet = createTestPet();
      expect(system.canTrain(pet, now).allowed).toBe(true);
    });

    it('rejects training for egg stage', () => {
      const pet = createTestPet({ lifeStage: 'egg' });
      const result = system.canTrain(pet, now);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('too young');
    });

    it('rejects training for blob stage', () => {
      const pet = createTestPet({ lifeStage: 'blob' });
      expect(system.canTrain(pet, now).allowed).toBe(false);
    });

    it('allows training for juvenile stage', () => {
      const pet = createTestPet({ lifeStage: 'juvenile' });
      expect(system.canTrain(pet, now).allowed).toBe(true);
    });

    it('rejects when daily limit reached', () => {
      const pet = createTestPet();
      pet.training.sessionsToday = MAX_SESSIONS_PER_DAY;
      pet.training.lastSessionTimestamp = now - 1000;

      const result = system.canTrain(pet, now);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('daily sessions');
    });

    it('rejects when on cooldown', () => {
      const pet = createTestPet();
      pet.training.lastSessionTimestamp = now - 10 * 1000; // 10 seconds ago

      const result = system.canTrain(pet, now);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('cooldown');
    });

    it('allows training after cooldown expires', () => {
      const pet = createTestPet();
      pet.training.lastSessionTimestamp =
        now - (SESSION_COOLDOWN + 1) * 1000;

      expect(system.canTrain(pet, now).allowed).toBe(true);
    });

    it('rejects when energy is too low', () => {
      const pet = createTestPet();
      pet.stats.energy = 10;

      const result = system.canTrain(pet, now);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('tired');
    });
  });

  describe('completeSession', () => {
    it('completes obedience session successfully', () => {
      const pet = createTestPet();
      const result = system.completeSession(pet, 'obedience', now);

      expect(result.success).toBe(true);
      expect(result.rewards).toBeDefined();
      expect(result.rewards!.discipline).toBe(8);
    });

    it('increases discipline stat', () => {
      const pet = createTestPet();
      const initialDiscipline = pet.stats.discipline;

      system.completeSession(pet, 'obedience', now);

      expect(pet.stats.discipline).toBeGreaterThan(initialDiscipline);
    });

    it('decreases energy after training', () => {
      const pet = createTestPet();
      const initialEnergy = pet.stats.energy;

      system.completeSession(pet, 'agility', now);

      expect(pet.stats.energy).toBeLessThan(initialEnergy);
    });

    it('increases skill proficiency', () => {
      const pet = createTestPet();

      system.completeSession(pet, 'tricks', now);

      expect(pet.training.skills.tricks).toBeGreaterThan(0);
    });

    it('adds fatigue per session', () => {
      const pet = createTestPet();

      system.completeSession(pet, 'obedience', now);

      expect(pet.training.fatigue).toBe(FATIGUE_PER_SESSION);
    });

    it('increments session count', () => {
      const pet = createTestPet();

      system.completeSession(pet, 'obedience', now);

      expect(pet.training.sessionsToday).toBe(1);
    });

    it('applies learning multiplier for juvenile (faster learning)', () => {
      const juvenile = createTestPet({ lifeStage: 'juvenile' });
      const adult = createTestPet({ lifeStage: 'adult' });

      system.completeSession(juvenile, 'tricks', now);
      system.completeSession(adult, 'tricks', now);

      expect(juvenile.training.skills.tricks).toBeGreaterThan(
        adult.training.skills.tricks,
      );
    });

    it('fails when pet cannot train', () => {
      const pet = createTestPet({ lifeStage: 'egg' });
      const result = system.completeSession(pet, 'obedience', now);

      expect(result.success).toBe(false);
    });

    it('reports overtraining when fatigue exceeds threshold', () => {
      const pet = createTestPet();
      pet.training.fatigue = OVERTRAINING_THRESHOLD - FATIGUE_PER_SESSION + 1;

      const result = system.completeSession(pet, 'obedience', now);

      expect(result.overtrained).toBe(true);
    });

    it('updates lastSessionTimestamp', () => {
      const pet = createTestPet();

      system.completeSession(pet, 'obedience', now);

      expect(pet.training.lastSessionTimestamp).toBe(now);
    });
  });

  describe('tick', () => {
    it('recovers fatigue over time', () => {
      const pet = createTestPet();
      pet.training.fatigue = 50;

      system.tick(pet, 100);

      expect(pet.training.fatigue).toBeLessThan(50);
    });

    it('does not reduce fatigue below 0', () => {
      const pet = createTestPet();
      pet.training.fatigue = 0.001;

      system.tick(pet, 10);

      expect(pet.training.fatigue).toBeGreaterThanOrEqual(0);
    });

    it('increases stress when overtrained', () => {
      const pet = createTestPet();
      pet.training.fatigue = OVERTRAINING_THRESHOLD + 10;
      const initialStress = pet.hiddenStats.stress;

      system.tick(pet, 60);

      expect(pet.hiddenStats.stress).toBeGreaterThan(initialStress);
    });

    it('does not increase stress below overtraining threshold', () => {
      const pet = createTestPet();
      pet.training.fatigue = OVERTRAINING_THRESHOLD - 10;
      const initialStress = pet.hiddenStats.stress;

      system.tick(pet, 60);

      expect(pet.hiddenStats.stress).toBe(initialStress);
    });
  });

  describe('getRemainingCooldown', () => {
    it('returns 0 when no previous session', () => {
      const pet = createTestPet();
      expect(system.getRemainingCooldown(pet, now)).toBe(0);
    });

    it('returns remaining time during cooldown', () => {
      const pet = createTestPet();
      pet.training.lastSessionTimestamp = now - 100 * 1000; // 100s ago

      const remaining = system.getRemainingCooldown(pet, now);
      expect(remaining).toBeCloseTo(SESSION_COOLDOWN - 100, 0);
    });

    it('returns 0 after cooldown expires', () => {
      const pet = createTestPet();
      pet.training.lastSessionTimestamp =
        now - (SESSION_COOLDOWN + 1) * 1000;

      expect(system.getRemainingCooldown(pet, now)).toBe(0);
    });
  });

  describe('daily session reset', () => {
    it('resets session count on new day', () => {
      const pet = createTestPet();
      // Set last session to yesterday
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      pet.training.sessionsToday = MAX_SESSIONS_PER_DAY;
      pet.training.lastSessionTimestamp = yesterday.getTime();

      // Should allow training since it's a new day
      const result = system.canTrain(pet, now);
      expect(result.allowed).toBe(true);
    });
  });
});
