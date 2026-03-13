/**
 * Training System — manages skill training sessions for the pet.
 *
 * Training improves discipline and skill proficiency but overtraining
 * causes stress. Sessions have cooldowns and daily limits.
 */

import { PetState, TrainingSkill, TrainingState } from '../data/SaveSchema';
import { LifeStage, StatName } from '../data/StatsConfig';
import {
  SESSION_COOLDOWN,
  SESSION_DURATION,
  MAX_SESSIONS_PER_DAY,
  FATIGUE_PER_SESSION,
  FATIGUE_RECOVERY_RATE,
  OVERTRAINING_THRESHOLD,
  OVERTRAINING_STRESS_RATE,
  SKILL_REWARDS,
  TRAINABLE_STAGES,
  STAGE_LEARNING_MULTIPLIER,
} from '../data/TrainingConfig';

export interface TrainingSessionResult {
  success: boolean;
  reason?: string;
  rewards?: {
    discipline: number;
    happiness: number;
    energy: number;
    bond: number;
    skillGain: number;
  };
  overtrained: boolean;
}

export class TrainingSystem {
  /**
   * Check whether the pet can start a training session right now.
   */
  canTrain(pet: PetState, now: number): { allowed: boolean; reason?: string } {
    const stage = pet.lifeStage as LifeStage;
    if (!TRAINABLE_STAGES.includes(stage)) {
      return { allowed: false, reason: 'Pet is too young to train' };
    }

    const training = pet.training;

    // Check daily session limit (reset if new day)
    const sessionsToday = this.getSessionsToday(training, now);
    if (sessionsToday >= MAX_SESSIONS_PER_DAY) {
      return { allowed: false, reason: 'Maximum daily sessions reached' };
    }

    // Check cooldown
    const elapsed = (now - training.lastSessionTimestamp) / 1000;
    if (training.lastSessionTimestamp > 0 && elapsed < SESSION_COOLDOWN) {
      return { allowed: false, reason: 'Training is on cooldown' };
    }

    // Check energy — need at least 15 to train
    if (pet.stats.energy < 15) {
      return { allowed: false, reason: 'Pet is too tired to train' };
    }

    return { allowed: true };
  }

  /**
   * Complete a training session for the given skill.
   * Applies stat rewards and fatigue. Mutates pet in place.
   */
  completeSession(
    pet: PetState,
    skill: TrainingSkill,
    now: number,
  ): TrainingSessionResult {
    const check = this.canTrain(pet, now);
    if (!check.allowed) {
      return { success: false, reason: check.reason, overtrained: false };
    }

    const stage = pet.lifeStage as LifeStage;
    const rewards = { ...SKILL_REWARDS[skill] };
    const learningMult = STAGE_LEARNING_MULTIPLIER[stage] ?? 1.0;

    // Apply skill gain with learning multiplier
    rewards.skillGain = Math.round(rewards.skillGain * learningMult);

    // Apply stat changes
    const statChanges: Partial<Record<StatName, number>> = {
      discipline: rewards.discipline,
      happiness: rewards.happiness,
      energy: rewards.energy,
      bond: rewards.bond,
    };

    for (const [stat, delta] of Object.entries(statChanges)) {
      pet.stats[stat as StatName] = clamp(
        pet.stats[stat as StatName] + delta,
        0,
        100,
      );
    }

    // Apply skill proficiency gain
    pet.training.skills[skill] = clamp(
      pet.training.skills[skill] + rewards.skillGain,
      0,
      100,
    );

    // Update training state
    pet.training.fatigue = clamp(
      pet.training.fatigue + FATIGUE_PER_SESSION,
      0,
      100,
    );

    // Reset sessions if new day, then increment
    pet.training.sessionsToday = this.getSessionsToday(pet.training, now) + 1;
    pet.training.lastSessionTimestamp = now;

    const overtrained = pet.training.fatigue >= OVERTRAINING_THRESHOLD;

    return { success: true, rewards, overtrained };
  }

  /**
   * Tick the training system forward (called each frame).
   * Recovers fatigue over time and applies overtraining stress.
   */
  tick(pet: PetState, dt: number): void {
    const training = pet.training;

    // Recover fatigue over time
    if (training.fatigue > 0) {
      training.fatigue = clamp(
        training.fatigue - FATIGUE_RECOVERY_RATE * dt,
        0,
        100,
      );
    }

    // Apply stress if overtrained
    if (training.fatigue >= OVERTRAINING_THRESHOLD) {
      pet.hiddenStats.stress = clamp(
        pet.hiddenStats.stress + OVERTRAINING_STRESS_RATE * dt,
        0,
        100,
      );
    }
  }

  /** Get session duration in seconds. */
  getSessionDuration(): number {
    return SESSION_DURATION;
  }

  /** Get cooldown duration in seconds. */
  getCooldownDuration(): number {
    return SESSION_COOLDOWN;
  }

  /**
   * Get remaining cooldown time in seconds (0 if ready).
   */
  getRemainingCooldown(pet: PetState, now: number): number {
    if (pet.training.lastSessionTimestamp === 0) return 0;
    const elapsed = (now - pet.training.lastSessionTimestamp) / 1000;
    return Math.max(0, SESSION_COOLDOWN - elapsed);
  }

  /**
   * Get sessions done today, resetting count if it's a new day.
   */
  private getSessionsToday(training: TrainingState, now: number): number {
    if (training.lastSessionTimestamp === 0) return 0;

    const lastDate = new Date(training.lastSessionTimestamp);
    const nowDate = new Date(now);

    const sameDay =
      lastDate.getFullYear() === nowDate.getFullYear() &&
      lastDate.getMonth() === nowDate.getMonth() &&
      lastDate.getDate() === nowDate.getDate();

    return sameDay ? training.sessionsToday : 0;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
