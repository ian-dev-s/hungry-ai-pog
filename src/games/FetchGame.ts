/**
 * Fetch — timing-based throw & catch game.
 * Player clicks/taps to throw, then must click in the catch zone at the right moment.
 * Builds happiness, drains energy.
 */

import type { Renderer } from '@engine/Renderer';
import type { PetState } from '@data/SaveSchema';
import type { MiniGame, MiniGameCallbacks } from './MiniGame';

type FetchPhase = 'ready' | 'throwing' | 'flying' | 'catch-window' | 'result';

export class FetchGame implements MiniGame {
  readonly id = 'fetch';

  private callbacks: MiniGameCallbacks;
  private phase: FetchPhase = 'ready';
  private elapsed = 0;
  private roundTime = 0;
  private round = 0;
  private maxRounds = 5;
  private catches = 0;
  private catchAccuracy: number[] = [];
  private finished = false;

  // Ball physics
  private ballX = 0;
  private ballY = 0;
  private ballTargetX = 0;
  private throwProgress = 0;
  private catchWindowStart = 0;
  private catchWindowDuration = 1.2;

  private canvas: HTMLCanvasElement | null = null;

  constructor(callbacks: MiniGameCallbacks) {
    this.callbacks = callbacks;
  }

  start(_pet: PetState, canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.phase = 'ready';
    this.round = 0;
    this.catches = 0;
    this.catchAccuracy = [];
    this.finished = false;
    this.elapsed = 0;
    canvas.addEventListener('click', this.handleClick);
    document.addEventListener('keydown', this.handleKey);
  }

  stop(): void {
    this.canvas?.removeEventListener('click', this.handleClick);
    document.removeEventListener('keydown', this.handleKey);
  }

  private handleKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.callbacks.onQuit();
    if (e.key === ' ' || e.key === 'Enter') this.handleAction();
  };

  private handleClick = (): void => {
    this.handleAction();
  };

  private handleAction(): void {
    if (this.phase === 'ready') {
      this.startThrow();
    } else if (this.phase === 'catch-window') {
      this.attemptCatch();
    } else if (this.phase === 'result') {
      this.callbacks.onComplete(this.getScore());
    }
  }

  private startThrow(): void {
    this.round++;
    this.phase = 'throwing';
    this.throwProgress = 0;
    this.ballX = 240;
    this.ballY = 500;
    this.ballTargetX = 100 + Math.random() * 280;
    this.roundTime = 0;
  }

  private attemptCatch(): void {
    // Calculate accuracy based on timing within catch window
    const elapsed = this.roundTime - this.catchWindowStart;
    const center = this.catchWindowDuration / 2;
    const accuracy = Math.max(0, 1 - Math.abs(elapsed - center) / center);
    this.catches++;
    this.catchAccuracy.push(accuracy);

    if (this.round >= this.maxRounds) {
      this.phase = 'result';
      this.finished = true;
    } else {
      this.phase = 'ready';
    }
  }

  update(dt: number): void {
    this.elapsed += dt;
    this.roundTime += dt;

    if (this.phase === 'throwing') {
      this.throwProgress += dt * 2.5;
      this.ballX = 240 + (this.ballTargetX - 240) * Math.min(1, this.throwProgress);
      this.ballY = 500 - Math.sin(Math.min(1, this.throwProgress) * Math.PI) * 300;

      if (this.throwProgress >= 1) {
        this.phase = 'flying';
        this.roundTime = 0;
      }
    } else if (this.phase === 'flying') {
      // Ball bounces at target, then catch window opens
      this.ballY = 500 - Math.abs(Math.sin(this.roundTime * 4)) * 50;
      if (this.roundTime > 0.5) {
        this.phase = 'catch-window';
        this.catchWindowStart = this.roundTime;
        // Reduce window as rounds progress
        this.catchWindowDuration = Math.max(0.6, 1.2 - this.round * 0.1);
      }
    } else if (this.phase === 'catch-window') {
      const elapsed = this.roundTime - this.catchWindowStart;
      this.ballY = 500 - Math.abs(Math.sin(this.roundTime * 4)) * 30;
      if (elapsed > this.catchWindowDuration) {
        // Missed the catch
        this.catchAccuracy.push(0);
        if (this.round >= this.maxRounds) {
          this.phase = 'result';
          this.finished = true;
        } else {
          this.phase = 'ready';
        }
      }
    }
  }

  render(renderer: Renderer): void {
    renderer.clear('#2d5a27');
    const { ctx, width, height } = renderer;

    // Ground
    ctx.fillStyle = '#4a8c3f';
    ctx.fillRect(0, height - 140, width, 140);

    // Ball
    ctx.fillStyle = '#f5a623';
    ctx.beginPath();
    ctx.arc(this.ballX, this.ballY, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c77d18';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pet at catch position
    if (this.phase !== 'ready') {
      ctx.fillStyle = '#e94560';
      ctx.beginPath();
      ctx.arc(this.ballTargetX, height - 170, 30, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(this.ballTargetX - 10, height - 178, 6, 0, Math.PI * 2);
      ctx.arc(this.ballTargetX + 10, height - 178, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // UI
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Fetch  Round ${this.round}/${this.maxRounds}`, 16, 30);
    ctx.textAlign = 'right';
    ctx.fillText(`Catches: ${this.catches}`, width - 16, 30);

    // Phase instructions
    ctx.textAlign = 'center';
    ctx.font = '14px monospace';
    if (this.phase === 'ready') {
      ctx.fillText('Click or press SPACE to throw!', width / 2, height / 2 - 60);
    } else if (this.phase === 'catch-window') {
      // Timing indicator
      const elapsed = this.roundTime - this.catchWindowStart;
      const pct = elapsed / this.catchWindowDuration;
      const barWidth = 200;
      const barX = (width - barWidth) / 2;
      const barY = 60;

      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barWidth, 16);

      // Sweet spot in center
      ctx.fillStyle = '#4caf50';
      ctx.fillRect(barX + barWidth * 0.35, barY, barWidth * 0.3, 16);

      // Cursor
      ctx.fillStyle = '#fff';
      ctx.fillRect(barX + pct * barWidth - 2, barY - 4, 4, 24);

      ctx.fillStyle = '#ffeb3b';
      ctx.fillText('CATCH NOW!', width / 2, barY + 44);
    } else if (this.phase === 'result') {
      ctx.font = '20px monospace';
      ctx.fillStyle = '#ffeb3b';
      ctx.fillText(`Score: ${this.getScore()}`, width / 2, height / 2 - 20);
      ctx.font = '14px monospace';
      ctx.fillStyle = '#e0e0e0';
      ctx.fillText('Click to continue', width / 2, height / 2 + 20);
    }

    // ESC hint
    ctx.textAlign = 'right';
    ctx.font = '12px monospace';
    ctx.fillStyle = '#999';
    ctx.fillText('ESC = quit', width - 8, height - 8);
  }

  isFinished(): boolean {
    return this.finished;
  }

  getScore(): number {
    if (this.catchAccuracy.length === 0) return 0;
    const avgAccuracy =
      this.catchAccuracy.reduce((a, b) => a + b, 0) / this.maxRounds;
    return Math.round(avgAccuracy * 100);
  }
}
