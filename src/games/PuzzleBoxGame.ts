/**
 * Puzzle Box — pattern matching game.
 * A sequence of colored panels lights up; player must repeat the sequence.
 * Each successful round adds one more to the sequence. Builds discipline.
 */

import type { Renderer } from '@engine/Renderer';
import type { PetState } from '@data/SaveSchema';
import type { MiniGame, MiniGameCallbacks } from './MiniGame';

type PuzzlePhase = 'showing' | 'input' | 'correct' | 'wrong' | 'result';

const PANEL_COLORS = ['#e94560', '#4caf50', '#2196f3', '#ffeb3b'];
const PANEL_DIM = ['#742230', '#266028', '#11497a', '#7f761e'];

export class PuzzleBoxGame implements MiniGame {
  readonly id = 'puzzle-box';

  private callbacks: MiniGameCallbacks;
  private phase: PuzzlePhase = 'showing';
  private sequence: number[] = [];
  private inputIndex = 0;
  private showIndex = 0;
  private showTimer = 0;
  private flashTimer = 0;
  private round = 0;
  private maxRound = 8;
  private finished = false;
  private activePanel = -1;
  private elapsed = 0;
  private canvas: HTMLCanvasElement | null = null;

  constructor(callbacks: MiniGameCallbacks) {
    this.callbacks = callbacks;
  }

  start(_pet: PetState, canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.finished = false;
    this.round = 0;
    this.elapsed = 0;
    this.nextRound();
    canvas.addEventListener('click', this.handleClick);
    document.addEventListener('keydown', this.handleKey);
  }

  stop(): void {
    this.canvas?.removeEventListener('click', this.handleClick);
    document.removeEventListener('keydown', this.handleKey);
  }

  private handleKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.callbacks.onQuit();
    if (this.phase === 'result' && (e.key === ' ' || e.key === 'Enter')) {
      this.callbacks.onComplete(this.getScore());
    }
    // Number keys 1-4 for panel selection
    const num = parseInt(e.key);
    if (this.phase === 'input' && num >= 1 && num <= 4) {
      this.selectPanel(num - 1);
    }
  };

  private handleClick = (e: MouseEvent): void => {
    if (this.phase === 'result') {
      this.callbacks.onComplete(this.getScore());
      return;
    }
    if (this.phase !== 'input') return;

    const rect = this.canvas!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Panel layout: 2x2 grid centered
    const panelSize = 100;
    const gap = 20;
    const startX = (480 - panelSize * 2 - gap) / 2;
    const startY = 200;

    for (let i = 0; i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const px = startX + col * (panelSize + gap);
      const py = startY + row * (panelSize + gap);
      if (x >= px && x <= px + panelSize && y >= py && y <= py + panelSize) {
        this.selectPanel(i);
        return;
      }
    }
  };

  private nextRound(): void {
    this.round++;
    this.sequence.push(Math.floor(Math.random() * 4));
    this.phase = 'showing';
    this.showIndex = 0;
    this.showTimer = 0;
    this.inputIndex = 0;
    this.activePanel = -1;
  }

  private selectPanel(index: number): void {
    this.activePanel = index;
    this.flashTimer = 0.2;

    if (this.sequence[this.inputIndex] === index) {
      this.inputIndex++;
      if (this.inputIndex >= this.sequence.length) {
        if (this.round >= this.maxRound) {
          this.phase = 'result';
          this.finished = true;
        } else {
          this.phase = 'correct';
          this.flashTimer = 0.5;
        }
      }
    } else {
      this.phase = 'wrong';
      this.flashTimer = 0.8;
    }
  }

  update(dt: number): void {
    this.elapsed += dt;

    if (this.phase === 'showing') {
      this.showTimer += dt;
      const speed = 0.6;
      if (this.showTimer >= speed) {
        this.showTimer -= speed;
        this.activePanel = this.sequence[this.showIndex];
        this.showIndex++;
        if (this.showIndex > this.sequence.length) {
          this.phase = 'input';
          this.activePanel = -1;
        }
      }
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.activePanel = -1;
        if (this.phase === 'correct') {
          this.nextRound();
        } else if (this.phase === 'wrong') {
          this.phase = 'result';
          this.finished = true;
        }
      }
    }
  }

  render(renderer: Renderer): void {
    renderer.clear('#1a1a2e');
    const { ctx, width, height } = renderer;

    // Title
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Puzzle Box  Round ${this.round}/${this.maxRound}`, 16, 30);

    // Panels 2x2
    const panelSize = 100;
    const gap = 20;
    const startX = (width - panelSize * 2 - gap) / 2;
    const startY = 200;

    for (let i = 0; i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const px = startX + col * (panelSize + gap);
      const py = startY + row * (panelSize + gap);

      const isActive = this.activePanel === i;
      ctx.fillStyle = isActive ? PANEL_COLORS[i] : PANEL_DIM[i];
      ctx.fillRect(px, py, panelSize, panelSize);

      // Panel number
      ctx.fillStyle = '#fff';
      ctx.font = '20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${i + 1}`, px + panelSize / 2, py + panelSize / 2 + 7);
    }

    // Phase text
    ctx.textAlign = 'center';
    ctx.font = '14px monospace';
    const msgY = startY - 30;
    if (this.phase === 'showing') {
      ctx.fillStyle = '#ffeb3b';
      ctx.fillText('Watch the pattern...', width / 2, msgY);
    } else if (this.phase === 'input') {
      ctx.fillStyle = '#4caf50';
      ctx.fillText(`Repeat! (${this.inputIndex}/${this.sequence.length})`, width / 2, msgY);
    } else if (this.phase === 'correct') {
      ctx.fillStyle = '#4caf50';
      ctx.fillText('Correct!', width / 2, msgY);
    } else if (this.phase === 'wrong') {
      ctx.fillStyle = '#e94560';
      ctx.fillText('Wrong!', width / 2, msgY);
    } else if (this.phase === 'result') {
      ctx.font = '20px monospace';
      ctx.fillStyle = '#ffeb3b';
      ctx.fillText(`Score: ${this.getScore()}`, width / 2, height / 2 + 100);
      ctx.font = '14px monospace';
      ctx.fillStyle = '#e0e0e0';
      ctx.fillText(`Reached round ${this.round}`, width / 2, height / 2 + 130);
      ctx.fillText('Click to continue', width / 2, height / 2 + 160);
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
    // Score based on how far they got
    return Math.round((Math.max(0, this.round - 1) / this.maxRound) * 100);
  }
}
