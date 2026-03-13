/**
 * Configuration for the pet training system.
 * Training sessions improve discipline and skill proficiency
 * but overtraining causes stress and fatigue.
 */

import { TrainingSkill } from './SaveSchema';
import { LifeStage } from './StatsConfig';

/** Duration of a single training session in seconds. */
export const SESSION_DURATION = 60;

/** Cooldown between training sessions in seconds. */
export const SESSION_COOLDOWN = 300;

/** Maximum sessions per day before overtraining kicks in. */
export const MAX_SESSIONS_PER_DAY = 5;

/** Fatigue added per session. */
export const FATIGUE_PER_SESSION = 15;

/** Fatigue recovery rate (points per second) when not training. */
export const FATIGUE_RECOVERY_RATE = 0.008;

/** Fatigue threshold above which overtraining effects apply. */
export const OVERTRAINING_THRESHOLD = 60;

/** Stress increase rate (per second) when overtrained. */
export const OVERTRAINING_STRESS_RATE = 0.02;

/** Stat effects applied at session completion. */
export interface TrainingReward {
  discipline: number;
  happiness: number;
  energy: number;
  bond: number;
  skillGain: number;
}

/** Base rewards per skill type. */
export const SKILL_REWARDS: Record<TrainingSkill, TrainingReward> = {
  obedience: {
    discipline: 8,
    happiness: -2,
    energy: -10,
    bond: 3,
    skillGain: 5,
  },
  tricks: {
    discipline: 3,
    happiness: 5,
    energy: -12,
    bond: 5,
    skillGain: 4,
  },
  agility: {
    discipline: 4,
    happiness: 3,
    energy: -15,
    bond: 2,
    skillGain: 4,
  },
};

/** Life stages that can train. Egg and blob are too young. */
export const TRAINABLE_STAGES: LifeStage[] = [
  'juvenile',
  'adolescent',
  'adult',
  'elder',
];

/** Multiplier to skill gain based on life stage (learning speed). */
export const STAGE_LEARNING_MULTIPLIER: Partial<Record<LifeStage, number>> = {
  juvenile: 1.3,
  adolescent: 1.1,
  adult: 1.0,
  elder: 0.7,
};
