/**
 * Mini-Game Manager — handles game lifecycle, unlock logic,
 * score calculation, coin rewards, and stat effects.
 */

import type { PetState } from '@data/SaveSchema';
import type { LifeStage, StatName } from '@data/StatsConfig';
import {
  type MiniGameId,
  MINI_GAMES,
  ALL_GAME_IDS,
  isStageAtLeast,
  getPerformanceMultiplier,
} from '@data/MiniGameConfig';
import { StatsEngine } from './StatsEngine';

export interface MiniGameResult {
  gameId: MiniGameId;
  /** Score from 0–100 */
  score: number;
  /** Coins earned (after performance multiplier) */
  coinsEarned: number;
  /** Performance multiplier applied */
  performanceMultiplier: number;
}

export class MiniGameManager {
  private statsEngine = new StatsEngine();

  /** Get list of games unlocked for the pet's current life stage */
  getAvailableGames(pet: PetState): MiniGameId[] {
    const stage = pet.lifeStage as LifeStage;
    return ALL_GAME_IDS.filter((id) =>
      isStageAtLeast(stage, MINI_GAMES[id].unlockStage),
    );
  }

  /** Check if a specific game is unlocked for the pet */
  isGameUnlocked(pet: PetState, gameId: MiniGameId): boolean {
    const stage = pet.lifeStage as LifeStage;
    return isStageAtLeast(stage, MINI_GAMES[gameId].unlockStage);
  }

  /**
   * Complete a game: calculate rewards, apply stat effects, return result.
   * Score should be 0-100.
   */
  completeGame(pet: PetState, gameId: MiniGameId, score: number): MiniGameResult {
    const def = MINI_GAMES[gameId];
    const clampedScore = Math.max(0, Math.min(100, score));

    const perfMult = getPerformanceMultiplier(
      pet.stats.happiness,
      pet.stats.energy,
    );

    const coinsEarned = Math.round(def.baseCoins * (clampedScore / 100) * perfMult);

    // Apply stat effects scaled by score percentage
    for (const [stat, delta] of Object.entries(def.statEffects)) {
      if (delta === undefined) continue;
      const scaledDelta = delta * (clampedScore / 100);
      this.statsEngine.modifyStat(pet, stat as StatName, scaledDelta);
    }

    return {
      gameId,
      score: clampedScore,
      coinsEarned,
      performanceMultiplier: perfMult,
    };
  }
}
