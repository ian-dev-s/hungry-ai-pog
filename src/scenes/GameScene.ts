import type { Scene } from '@engine/SceneManager';
import type { Renderer } from '@engine/Renderer';
import { StatsEngine } from '../systems/StatsEngine';
import type { PetState } from '../data/SaveSchema';

export class GameScene implements Scene {
  readonly name = 'game';
  private elapsed = 0;
  private onMenu: () => void;
  private statsEngine: StatsEngine;
  private pet: PetState | null = null;

  constructor(onMenu: () => void) {
    this.onMenu = onMenu;
    this.statsEngine = new StatsEngine();
  }

  setPet(pet: PetState): void {
    this.pet = pet;
  }

  enter(): void {
    this.elapsed = 0;
    document.addEventListener('keydown', this.handleKey);
  }

  exit(): void {
    document.removeEventListener('keydown', this.handleKey);
  }

  private handleKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.onMenu();
  };

  update(dt: number): void {
    this.elapsed += dt;
  }

  render(renderer: Renderer): void {
    renderer.clear('#0f3460');
    const { ctx, width, height } = renderer;

    // Pet placeholder (bouncing circle)
    const y = height / 2 + Math.sin(this.elapsed * 2) * 20;
    ctx.fillStyle = '#e94560';
    ctx.beginPath();
    ctx.arc(width / 2, y, 40, 0, Math.PI * 2);
    ctx.fill();

    // Check for illness visual effects
    const isIll = this.pet && this.statsEngine.isIll(this.pet);
    const illnessInfo = this.pet ? this.statsEngine.getIllnessInfo(this.pet) : null;

    // Illness aura effect
    if (isIll && illnessInfo) {
      ctx.strokeStyle = this.getIllnessColor(illnessInfo.type);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(width / 2, y, 45 + Math.sin(this.elapsed * 4) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Eyes (sick version if ill)
    if (isIll) {
      // X eyes for sick pet
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 16, y - 12);
      ctx.lineTo(width / 2 - 8, y - 4);
      ctx.moveTo(width / 2 - 8, y - 12);
      ctx.lineTo(width / 2 - 16, y - 4);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(width / 2 + 8, y - 12);
      ctx.lineTo(width / 2 + 16, y - 4);
      ctx.moveTo(width / 2 + 16, y - 12);
      ctx.lineTo(width / 2 + 8, y - 4);
      ctx.stroke();
    } else {
      // Normal eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(width / 2 - 12, y - 8, 8, 0, Math.PI * 2);
      ctx.arc(width / 2 + 12, y - 8, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.arc(width / 2 - 10, y - 6, 4, 0, Math.PI * 2);
      ctx.arc(width / 2 + 14, y - 6, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // HUD
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Game Scene - Your pet lives here!', 16, 30);

    // Show illness status
    if (isIll && illnessInfo) {
      ctx.fillStyle = this.getIllnessColor(illnessInfo.type);
      ctx.fillText(`🦠 ${illnessInfo.name}`, 16, 50);
      ctx.fillStyle = '#e0e0e0';
      const barWidth = 100;
      ctx.strokeStyle = '#e0e0e0';
      ctx.strokeRect(16, 58, barWidth, 8);
      ctx.fillStyle = this.getIllnessColor(illnessInfo.type);
      ctx.fillRect(16, 58, barWidth * illnessInfo.progress, 8);
    }

    ctx.fillStyle = '#e0e0e0';
    ctx.textAlign = 'right';
    ctx.fillText('ESC = Menu', width - 16, 30);
  }

  private getIllnessColor(illnessType: string): string {
    const colors: Record<string, string> = {
      cold: '#87ceeb',
      flu: '#ff6b6b',
      fatigue: '#ffd700',
      infection: '#8b0000',
      poisoning: '#9932cc',
    };
    return colors[illnessType] || '#ffffff';
  }
}
