/**
 * Dance-Off — rhythm game.
 * Arrows scroll down; player must press matching arrow key when they hit the zone.
 * Builds happiness + bond, drains energy.
 */

import type { Renderer } from '@engine/Renderer';
import type { PetState } from '@data/SaveSchema';
import type { MiniGame, MiniGameCallbacks } from './MiniGame';

type Arrow = 'left' | 'right' | 'up' | 'down';
const ARROWS: Arrow[] = ['left', 'right', 'up', 'down'];
const ARROW_SYMBOLS: Record<Arrow, string> = {
  left: '\u2190',
  right: '\u2192',
  up: '\u2191',
  down: '\u2193',
};
const ARROW_KEYS: Record<string, Arrow> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};
const LANE_COLORS: Record<Arrow, string> = {
  left: '#e94560',
  up: '#4caf50',
  down: '#2196f3',
  right: '#ffeb3b',
};

interface Beat {
  arrow: Arrow;
  time: number;
  hit: boolean;
  missed: boolean;
}

export class DanceOffGame implements MiniGame {
  readonly id = 'dance-off';

  private callbacks: MiniGameCallbacks;
  private beats: Beat[] = [];
  private elapsed = 0;
  private duration = 20;
  private hitCount = 0;
  private missCount = 0;
  private totalBeats = 0;
  private finished = false;
  private flashFeedback = '';
  private flashTimer = 0;
  private canvas: HTMLCanvasElement | null = null;

  // Hit zone Y position (from top)
  private hitZoneY = 520;
  // Scroll speed (pixels per second)
  private scrollSpeed = 200;

  constructor(callbacks: MiniGameCallbacks) {
    this.callbacks = callbacks;
  }

  start(_pet: PetState, canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.elapsed = 0;
    this.hitCount = 0;
    this.missCount = 0;
    this.finished = false;
    this.flashFeedback = '';
    this.flashTimer = 0;
    this.generateBeats();
    document.addEventListener('keydown', this.handleKey);
  }

  stop(): void {
    document.removeEventListener('keydown', this.handleKey);
  }

  private generateBeats(): void {
    this.beats = [];
    const interval = 1.0; // one beat per second
    const count = Math.floor(this.duration / interval);
    this.totalBeats = count;

    for (let i = 0; i < count; i++) {
      this.beats.push({
        arrow: ARROWS[Math.floor(Math.random() * ARROWS.length)],
        time: 2 + i * interval + (Math.random() * 0.3 - 0.15),
        hit: false,
        missed: false,
      });
    }
  }

  private handleKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this.callbacks.onQuit();
      return;
    }
    if (this.finished && (e.key === ' ' || e.key === 'Enter')) {
      this.callbacks.onComplete(this.getScore());
      return;
    }

    const arrow = ARROW_KEYS[e.key];
    if (!arrow) return;

    // Find the closest unhit beat of matching arrow within tolerance
    const tolerance = 0.35;
    let closest: Beat | null = null;
    let closestDist = Infinity;

    for (const beat of this.beats) {
      if (beat.hit || beat.missed || beat.arrow !== arrow) continue;
      const dist = Math.abs(beat.time - this.elapsed);
      if (dist < tolerance && dist < closestDist) {
        closest = beat;
        closestDist = dist;
      }
    }

    if (closest) {
      closest.hit = true;
      this.hitCount++;
      this.flashFeedback = closestDist < 0.1 ? 'Perfect!' : 'Good!';
      this.flashTimer = 0.3;
    } else {
      this.missCount++;
      this.flashFeedback = 'Miss!';
      this.flashTimer = 0.3;
    }
  };

  update(dt: number): void {
    this.elapsed += dt;

    if (this.flashTimer > 0) this.flashTimer -= dt;

    // Mark beats that passed the hit zone as missed
    for (const beat of this.beats) {
      if (!beat.hit && !beat.missed && beat.time < this.elapsed - 0.5) {
        beat.missed = true;
      }
    }

    // Check if song is over
    if (this.elapsed >= this.duration + 3) {
      this.finished = true;
    }
  }

  render(renderer: Renderer): void {
    renderer.clear('#1a1a2e');
    const { ctx, width, height } = renderer;

    // Lane dividers
    const laneWidth = width / 4;
    for (let i = 1; i < 4; i++) {
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(laneWidth * i, 0);
      ctx.lineTo(laneWidth * i, height);
      ctx.stroke();
    }

    // Hit zone line
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.hitZoneY);
    ctx.lineTo(width, this.hitZoneY);
    ctx.stroke();

    // Lane labels at hit zone
    const laneOrder: Arrow[] = ['left', 'up', 'down', 'right'];
    ctx.font = '24px monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = LANE_COLORS[laneOrder[i]] + '66';
      ctx.fillText(
        ARROW_SYMBOLS[laneOrder[i]],
        laneWidth * i + laneWidth / 2,
        this.hitZoneY + 30,
      );
    }

    // Beats
    for (const beat of this.beats) {
      if (beat.hit || beat.missed) continue;
      const laneIndex = laneOrder.indexOf(beat.arrow);
      const beatY = this.hitZoneY - (beat.time - this.elapsed) * this.scrollSpeed;
      if (beatY < -40 || beatY > height + 40) continue;

      ctx.fillStyle = LANE_COLORS[beat.arrow];
      const beatX = laneWidth * laneIndex + laneWidth / 2;
      ctx.font = '32px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ARROW_SYMBOLS[beat.arrow], beatX, beatY + 10);
    }

    // HUD
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Dance-Off', 16, 30);
    ctx.textAlign = 'right';
    ctx.fillText(`Hits: ${this.hitCount}/${this.totalBeats}`, width - 16, 30);

    // Flash feedback
    if (this.flashTimer > 0) {
      ctx.textAlign = 'center';
      ctx.font = '20px monospace';
      ctx.fillStyle =
        this.flashFeedback === 'Miss!' ? '#e94560' : '#4caf50';
      ctx.fillText(this.flashFeedback, width / 2, this.hitZoneY - 30);
    }

    // Result
    if (this.finished) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, width, height);
      ctx.font = '20px monospace';
      ctx.fillStyle = '#ffeb3b';
      ctx.textAlign = 'center';
      ctx.fillText(`Score: ${this.getScore()}`, width / 2, height / 2 - 20);
      ctx.font = '14px monospace';
      ctx.fillStyle = '#e0e0e0';
      ctx.fillText(
        `${this.hitCount} hits / ${this.totalBeats} beats`,
        width / 2,
        height / 2 + 10,
      );
      ctx.fillText('Press ENTER to continue', width / 2, height / 2 + 40);
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
    if (this.totalBeats === 0) return 0;
    return Math.round((this.hitCount / this.totalBeats) * 100);
  }
}
