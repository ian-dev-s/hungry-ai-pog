/**
 * Evolution system that determines adult form based on weighted care history.
 * Tracks care metrics during growth and selects the best-matching archetype
 * when the pet reaches the Adult stage.
 */

import {
  type CareHistory,
  type ElementType,
  type EvolutionArchetype,
  type EvolutionWeights,
  createDefaultCareHistory,
  getArchetypesForElement,
} from '@data/EvolutionArchetypes';
import { LifeStage } from '@data/LifeStages';
import type { PetState } from '@data/SaveSchema';

export interface EvolutionResult {
  archetype: EvolutionArchetype;
  score: number;
  isSecret: boolean;
}

/** Threshold for secret evolution: all care dimensions must be within this range of each other. */
const SECRET_BALANCE_THRESHOLD = 10;

/** Minimum score for any non-secret archetype to be selected (normalized 0-1). */
const MIN_EVOLUTION_SCORE = 0.1;

export class EvolutionSystem {
  private careHistory: CareHistory;
  private happinessSamples: number[] = [];
  private bondSamples: number[] = [];
  private totalInteractions = 0;
  private disciplineInteractions = 0;
  private uniqueFoods: Set<string> = new Set();
  private activitiesCompleted = 0;

  constructor(careHistory?: CareHistory) {
    this.careHistory = careHistory ?? createDefaultCareHistory();
    // Restore tracking state from care history
    this.happinessSamples = [this.careHistory.happinessAvg];
    this.bondSamples = [this.careHistory.bondAvg];
    this.uniqueFoods = new Set();
    this.activitiesCompleted = this.careHistory.activitiesCompleted;
  }

  /** Record a periodic snapshot of the pet's stats. Call regularly (e.g., every minute). */
  recordSnapshot(pet: PetState): void {
    this.happinessSamples.push(pet.stats.happiness);
    this.bondSamples.push(pet.stats.bond);
    this.updateCareHistory();
  }

  /** Record that a feeding occurred with a specific food type. */
  recordFeeding(foodId: string): void {
    this.uniqueFoods.add(foodId);
    this.totalInteractions++;
    this.updateCareHistory();
  }

  /** Record a discipline-related interaction (training, scolding). */
  recordDiscipline(): void {
    this.disciplineInteractions++;
    this.totalInteractions++;
    this.updateCareHistory();
  }

  /** Record a non-discipline interaction. */
  recordInteraction(): void {
    this.totalInteractions++;
    this.updateCareHistory();
  }

  /** Record a completed activity (mini-game, exploration, etc.). */
  recordActivity(): void {
    this.activitiesCompleted++;
    this.updateCareHistory();
  }

  /** Set a secret flag for special evolution conditions. */
  setSecretFlag(flag: string): void {
    this.careHistory.secretFlags[flag] = true;
  }

  /** Get the current care history snapshot. */
  getCareHistory(): CareHistory {
    return { ...this.careHistory, secretFlags: { ...this.careHistory.secretFlags } };
  }

  /**
   * Determine the evolution archetype for the pet.
   * Called when pet transitions to Adult stage.
   */
  determineEvolution(element: ElementType): EvolutionResult {
    const archetypes = getArchetypesForElement(element);
    const history = this.careHistory;

    // Normalize care history to 0-1 scale
    const normalized = this.normalizeCareHistory(history);

    // Check for secret evolution first (all dimensions balanced)
    if (this.isBalanced(normalized)) {
      const secret = archetypes.find((a) => a.secret);
      if (secret) {
        return {
          archetype: secret,
          score: 1,
          isSecret: true,
        };
      }
    }

    // Score each non-secret archetype
    let bestMatch: EvolutionArchetype = archetypes[0];
    let bestScore = -1;

    for (const archetype of archetypes) {
      if (archetype.secret) continue;
      const score = this.scoreArchetype(normalized, archetype.weights);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = archetype;
      }
    }

    return {
      archetype: bestMatch,
      score: Math.max(MIN_EVOLUTION_SCORE, bestScore),
      isSecret: false,
    };
  }

  private normalizeCareHistory(
    history: CareHistory,
  ): EvolutionWeights {
    return {
      happiness: history.happinessAvg / 100,
      discipline: history.disciplineRatio,
      dietVariety: Math.min(1, history.uniqueFoodsCount / 15),
      activityLevel: Math.min(1, history.activitiesCompleted / 50),
      socialBond: history.bondAvg / 100,
    };
  }

  private isBalanced(normalized: EvolutionWeights): boolean {
    const values = Object.values(normalized);
    const min = Math.min(...values);
    const max = Math.max(...values);
    // All dimensions within threshold (on 0-100 scale)
    return (max - min) * 100 <= SECRET_BALANCE_THRESHOLD;
  }

  private scoreArchetype(
    normalized: EvolutionWeights,
    weights: EvolutionWeights,
  ): number {
    // Weighted dot product — higher score means better match
    let score = 0;
    const keys = Object.keys(weights) as Array<keyof EvolutionWeights>;
    for (const key of keys) {
      score += normalized[key] * weights[key];
    }
    return score;
  }

  private updateCareHistory(): void {
    this.careHistory.happinessAvg = this.average(this.happinessSamples);
    this.careHistory.bondAvg = this.average(this.bondSamples);
    this.careHistory.disciplineRatio =
      this.totalInteractions > 0
        ? this.disciplineInteractions / this.totalInteractions
        : 0.5;
    this.careHistory.uniqueFoodsCount = this.uniqueFoods.size;
    this.careHistory.activitiesCompleted = this.activitiesCompleted;
  }

  private average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, v) => sum + v, 0) / arr.length;
  }
}

/**
 * Determine if a pet should evolve and what it should evolve into.
 * Convenience function for stage transition checks.
 */
export function shouldEvolve(pet: PetState, newStage: LifeStage): boolean {
  return newStage === LifeStage.Adult;
}
