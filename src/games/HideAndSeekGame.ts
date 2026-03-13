/**
 * Hide & Seek — tap-to-find game.
 * Pet hides behind objects; player taps/clicks to find them within time limit.
 * Multiple rounds with decreasing time. Builds bond + bravery.
 */

import type { Renderer } from '@engine/Renderer';
import type { PetState } from '@data/SaveSchema';
import type { MiniGame, MiniGameCallbacks } from './MiniGame';

interface HidingSpot {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  label: string;
}

type SeekPhase = 'countdown' | 'seeking' | 'found' | 'timeout' | 'result';

export class HideAndSeekGame implements MiniGame {
  readonly id = 'hide-and-seek';

  private callbacks: MiniGameCallbacks;
  private phase: SeekPhase = 'countdown';
  private round = 0;
  private maxRounds = 5;
  private foundCount = 0;
  private roundTimer = 0;
  private roundTimeLimit = 5;
  private countdownTimer = 0;
  private finished = false;
  private elapsed = 0;

  private spots: HidingSpot[] = [];
  private hiddenSpotIndex = -1;
  private hintTimer = 0;
  private showHint = false;
  private canvas: HTMLCanvasElement | null = null;

  constructor(callbacks: MiniGameCallbacks) {
    this.callbacks = callbacks;
  }

  start(_pet: PetState, canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.finished = false;
    this.round = 0;
    this.foundCount = 0;
    this.elapsed = 0;
    this.generateSpots();
    this.startRound();
    canvas.addEventListener('click', this.handleClick);
    document.addEventListener('keydown', this.handleKey);
  }

  stop(): void {
    this.canvas?.removeEventListener('click', this.handleClick);
    document.removeEventListener('keydown', this.handleKey);
  }

  private generateSpots(): void {
    this.spots = [
      { x: 40, y: 200, width: 80, height: 120, color: '#5d4037', label: 'Tree' },
      { x: 180, y: 240, width: 100, height: 80, color: '#795548', label: 'Bush' },
      { x: 340, y: 180, width: 90, height: 140, color: '#6d4c41', label: 'Rock' },
      { x: 60, y: 400, width: 110, height: 70, color: '#4e342e', label: 'Log' },
      { x: 260, y: 380, width: 80, height: 100, color: '#3e2723', label: 'Stump' },
      { x: 370, y: 420, width: 70, height: 90, color: '#5d4037', label: 'Barrel' },
    ];
  }

  private startRound(): void {
    this.round++;
    this.phase = 'countdown';
    this.countdownTimer = 1.5;
    this.hiddenSpotIndex = Math.floor(Math.random() * this.spots.length);
    this.roundTimeLimit = Math.max(2.5, 5 - (this.round - 1) * 0.5);
    this.roundTimer = 0;
    this.hintTimer = 0;
    this.showHint = false;
  }

  private handleKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.callbacks.onQuit();
    if (this.phase === 'result' && (e.key === ' ' || e.key === 'Enter')) {
      this.callbacks.onComplete(this.getScore());
    }
  };

  private handleClick = (e: MouseEvent): void => {
    if (this.phase === 'result') {
      this.callbacks.onComplete(this.getScore());
      return;
    }
    if (this.phase !== 'seeking') return;

    const rect = this.canvas!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (let i = 0; i < this.spots.length; i++) {
      const spot = this.spots[i];
      if (x >= spot.x && x <= spot.x + spot.width && y >= spot.y && y <= spot.y + spot.height) {
        if (i === this.hiddenSpotIndex) {
          this.foundCount++;
          this.phase = 'found';
          this.countdownTimer = 0.8;
        }
        break;
      }
    }
  };

  update(dt: number): void {
    this.elapsed += dt;

    if (this.phase === 'countdown') {
      this.countdownTimer -= dt;
      if (this.countdownTimer <= 0) {
        this.phase = 'seeking';
        this.roundTimer = 0;
      }
    } else if (this.phase === 'seeking') {
      this.roundTimer += dt;
      this.hintTimer += dt;
      // Show subtle hint after 60% of time
      if (this.hintTimer > this.roundTimeLimit * 0.6) {
        this.showHint = true;
      }
      if (this.roundTimer >= this.roundTimeLimit) {
        this.phase = 'timeout';
        this.countdownTimer = 0.8;
      }
    } else if (this.phase === 'found' || this.phase === 'timeout') {
      this.countdownTimer -= dt;
      if (this.countdownTimer <= 0) {
        if (this.round >= this.maxRounds) {
          this.phase = 'result';
          this.finished = true;
        } else {
          this.startRound();
        }
      }
    }
  }

  render(renderer: Renderer): void {
    renderer.clear('#2d5a27');
    const { ctx, width, height } = renderer;

    // Ground
    ctx.fillStyle = '#4a8c3f';
    ctx.fillRect(0, height - 100, width, 100);

    // Hiding spots
    for (let i = 0; i < this.spots.length; i++) {
      const spot = this.spots[i];
      ctx.fillStyle = spot.color;
      ctx.fillRect(spot.x, spot.y, spot.width, spot.height);

      // Show pet peeking if hint
      if (this.showHint && i === this.hiddenSpotIndex && this.phase === 'seeking') {
        ctx.fillStyle = '#e94560';
        ctx.beginPath();
        ctx.arc(spot.x + spot.width / 2, spot.y - 5, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Found/timeout: show pet at hiding spot
    if ((this.phase === 'found' || this.phase === 'timeout') && this.hiddenSpotIndex >= 0) {
      const spot = this.spots[this.hiddenSpotIndex];
      ctx.fillStyle = '#e94560';
      ctx.beginPath();
      ctx.arc(spot.x + spot.width / 2, spot.y - 20, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(spot.x + spot.width / 2 - 6, spot.y - 24, 4, 0, Math.PI * 2);
      ctx.arc(spot.x + spot.width / 2 + 6, spot.y - 24, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // HUD
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Hide & Seek  ${this.round}/${this.maxRounds}`, 16, 30);
    ctx.textAlign = 'right';
    ctx.fillText(`Found: ${this.foundCount}`, width - 16, 30);

    // Timer bar
    if (this.phase === 'seeking') {
      const pct = 1 - this.roundTimer / this.roundTimeLimit;
      ctx.fillStyle = '#333';
      ctx.fillRect(16, 50, width - 32, 10);
      ctx.fillStyle = pct > 0.3 ? '#4caf50' : '#e94560';
      ctx.fillRect(16, 50, (width - 32) * pct, 10);
    }

    // Phase text
    ctx.textAlign = 'center';
    ctx.font = '18px monospace';
    if (this.phase === 'countdown') {
      ctx.fillStyle = '#ffeb3b';
      ctx.fillText('Pet is hiding...', width / 2, 100);
    } else if (this.phase === 'seeking') {
      ctx.fillStyle = '#e0e0e0';
      ctx.fillText('Click where the pet is hiding!', width / 2, 100);
    } else if (this.phase === 'found') {
      ctx.fillStyle = '#4caf50';
      ctx.fillText('Found!', width / 2, 100);
    } else if (this.phase === 'timeout') {
      ctx.fillStyle = '#e94560';
      ctx.fillText('Too slow!', width / 2, 100);
    } else if (this.phase === 'result') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, width, height);
      ctx.font = '20px monospace';
      ctx.fillStyle = '#ffeb3b';
      ctx.fillText(`Score: ${this.getScore()}`, width / 2, height / 2 - 20);
      ctx.font = '14px monospace';
      ctx.fillStyle = '#e0e0e0';
      ctx.fillText(`Found ${this.foundCount}/${this.maxRounds}`, width / 2, height / 2 + 10);
      ctx.fillText('Click to continue', width / 2, height / 2 + 40);
    }

    ctx.textAlign = 'right';
    ctx.font = '12px monospace';
    ctx.fillStyle = '#999';
    ctx.fillText('ESC = quit', width - 8, height - 8);
  }

  isFinished(): boolean {
    return this.finished;
  }

  getScore(): number {
    return Math.round((this.foundCount / this.maxRounds) * 100);
  }
}
