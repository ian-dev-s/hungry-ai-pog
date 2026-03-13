/**
 * Base interface for all mini-games.
 * Each game manages its own update/render cycle and reports a score on completion.
 */

import type { Renderer } from '@engine/Renderer';
import type { PetState } from '@data/SaveSchema';

export interface MiniGameCallbacks {
  onComplete(score: number): void;
  onQuit(): void;
}

export interface MiniGame {
  readonly id: string;
  /** Initialize the game with pet state and canvas for input binding */
  start(pet: PetState, canvas: HTMLCanvasElement): void;
  /** Clean up event listeners */
  stop(): void;
  /** Update game logic; dt in seconds */
  update(dt: number): void;
  /** Render game state */
  render(renderer: Renderer): void;
  /** Whether the game has finished */
  isFinished(): boolean;
  /** Final score 0-100 */
  getScore(): number;
}
