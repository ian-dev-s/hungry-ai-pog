/**
 * Art Canvas — free drawing game with pet reactions to colors.
 * Player draws on canvas; pet reacts to different colors used.
 * Untimed — player clicks "Done" when finished. Builds happiness + bond.
 */

import type { Renderer } from '@engine/Renderer';
import type { PetState } from '@data/SaveSchema';
import type { MiniGame, MiniGameCallbacks } from './MiniGame';

const PALETTE = [
  { color: '#e94560', name: 'Red', reaction: 'excited' },
  { color: '#ff9800', name: 'Orange', reaction: 'warm' },
  { color: '#ffeb3b', name: 'Yellow', reaction: 'happy' },
  { color: '#4caf50', name: 'Green', reaction: 'calm' },
  { color: '#2196f3', name: 'Blue', reaction: 'sleepy' },
  { color: '#9c27b0', name: 'Purple', reaction: 'curious' },
  { color: '#fff', name: 'White', reaction: 'neutral' },
  { color: '#1a1a2e', name: 'Eraser', reaction: 'confused' },
];

interface Stroke {
  x: number;
  y: number;
  color: string;
  size: number;
}

export class ArtCanvasGame implements MiniGame {
  readonly id = 'art-canvas';

  private callbacks: MiniGameCallbacks;
  private strokes: Stroke[] = [];
  private selectedColor = 0;
  private brushSize = 4;
  private isDrawing = false;
  private finished = false;
  private elapsed = 0;
  private petReaction = '';
  private reactionTimer = 0;
  private colorsUsed = new Set<number>();
  private canvas: HTMLCanvasElement | null = null;

  // Drawing area bounds
  private readonly drawArea = { x: 0, y: 70, width: 480, height: 440 };
  // Palette area
  private readonly paletteY = 530;

  constructor(callbacks: MiniGameCallbacks) {
    this.callbacks = callbacks;
  }

  start(_pet: PetState, canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.strokes = [];
    this.selectedColor = 0;
    this.finished = false;
    this.elapsed = 0;
    this.colorsUsed.clear();
    this.petReaction = '';
    this.reactionTimer = 0;
    canvas.addEventListener('mousedown', this.handleMouseDown);
    canvas.addEventListener('mousemove', this.handleMouseMove);
    canvas.addEventListener('mouseup', this.handleMouseUp);
    canvas.addEventListener('click', this.handleClick);
    document.addEventListener('keydown', this.handleKey);
  }

  stop(): void {
    this.canvas?.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas?.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas?.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas?.removeEventListener('click', this.handleClick);
    document.removeEventListener('keydown', this.handleKey);
  }

  private handleKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.callbacks.onQuit();
    if (e.key === 'Enter') {
      this.finished = true;
      this.callbacks.onComplete(this.getScore());
    }
    // Number keys for color selection
    const num = parseInt(e.key);
    if (num >= 1 && num <= PALETTE.length) {
      this.selectColor(num - 1);
    }
    // Bracket keys for brush size
    if (e.key === '[') this.brushSize = Math.max(2, this.brushSize - 2);
    if (e.key === ']') this.brushSize = Math.min(16, this.brushSize + 2);
  };

  private getCanvasPos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private handleMouseDown = (e: MouseEvent): void => {
    const pos = this.getCanvasPos(e);
    if (this.isInDrawArea(pos.x, pos.y)) {
      this.isDrawing = true;
      this.addStroke(pos.x, pos.y);
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isDrawing) return;
    const pos = this.getCanvasPos(e);
    if (this.isInDrawArea(pos.x, pos.y)) {
      this.addStroke(pos.x, pos.y);
    }
  };

  private handleMouseUp = (): void => {
    this.isDrawing = false;
  };

  private handleClick = (e: MouseEvent): void => {
    const pos = this.getCanvasPos(e);

    // Check palette clicks
    const swatchSize = 40;
    const gap = 8;
    const startX = (480 - (swatchSize * PALETTE.length + gap * (PALETTE.length - 1))) / 2;
    for (let i = 0; i < PALETTE.length; i++) {
      const sx = startX + i * (swatchSize + gap);
      if (pos.x >= sx && pos.x <= sx + swatchSize &&
          pos.y >= this.paletteY && pos.y <= this.paletteY + swatchSize) {
        this.selectColor(i);
        return;
      }
    }

    // Check "Done" button
    if (pos.x >= 190 && pos.x <= 290 && pos.y >= 590 && pos.y <= 620) {
      this.finished = true;
      this.callbacks.onComplete(this.getScore());
    }
  };

  private selectColor(index: number): void {
    this.selectedColor = index;
    this.colorsUsed.add(index);
    this.petReaction = PALETTE[index].reaction;
    this.reactionTimer = 1.5;
  }

  private addStroke(x: number, y: number): void {
    this.strokes.push({
      x,
      y,
      color: PALETTE[this.selectedColor].color,
      size: this.brushSize,
    });
    this.colorsUsed.add(this.selectedColor);
  }

  private isInDrawArea(x: number, y: number): boolean {
    const a = this.drawArea;
    return x >= a.x && x <= a.x + a.width && y >= a.y && y <= a.y + a.height;
  }

  update(dt: number): void {
    this.elapsed += dt;
    if (this.reactionTimer > 0) this.reactionTimer -= dt;
  }

  render(renderer: Renderer): void {
    renderer.clear('#1a1a2e');
    const { ctx, width } = renderer;

    // Draw area background
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(this.drawArea.x, this.drawArea.y, this.drawArea.width, this.drawArea.height);

    // Draw strokes
    for (const stroke of this.strokes) {
      ctx.fillStyle = stroke.color;
      ctx.beginPath();
      ctx.arc(stroke.x, stroke.y, stroke.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Title
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Art Canvas', 16, 30);
    ctx.textAlign = 'right';
    ctx.fillText(`Brush: ${this.brushSize}px  [/] to resize`, width - 16, 30);
    ctx.textAlign = 'center';
    ctx.font = '12px monospace';
    ctx.fillText('Draw something for your pet!', width / 2, 55);

    // Palette
    const swatchSize = 40;
    const gap = 8;
    const startX = (width - (swatchSize * PALETTE.length + gap * (PALETTE.length - 1))) / 2;
    for (let i = 0; i < PALETTE.length; i++) {
      const sx = startX + i * (swatchSize + gap);
      ctx.fillStyle = PALETTE[i].color;
      ctx.fillRect(sx, this.paletteY, swatchSize, swatchSize);

      // Selection indicator
      if (i === this.selectedColor) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.strokeRect(sx - 2, this.paletteY - 2, swatchSize + 4, swatchSize + 4);
      }

      // Key hint
      ctx.fillStyle = '#999';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${i + 1}`, sx + swatchSize / 2, this.paletteY + swatchSize + 12);
    }

    // Pet reaction
    if (this.reactionTimer > 0 && this.petReaction) {
      ctx.fillStyle = '#ffeb3b';
      ctx.font = '14px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`Pet feels ${this.petReaction}!`, width - 16, this.paletteY - 10);
    }

    // Done button
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(190, 590, 100, 30);
    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Done', 240, 610);

    // ESC hint
    ctx.textAlign = 'right';
    ctx.font = '12px monospace';
    ctx.fillStyle = '#999';
    ctx.fillText('ESC = quit | ENTER = done', width - 8, 635);
  }

  isFinished(): boolean {
    return this.finished;
  }

  getScore(): number {
    // Score based on: strokes placed (engagement) + colors used (creativity)
    const strokeScore = Math.min(50, this.strokes.length * 0.5);
    const colorScore = Math.min(50, this.colorsUsed.size * (50 / PALETTE.length));
    return Math.round(strokeScore + colorScore);
  }
}
