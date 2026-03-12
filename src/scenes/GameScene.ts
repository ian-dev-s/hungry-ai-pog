import type { Scene } from '@engine/SceneManager';
import type { Renderer } from '@engine/Renderer';

export class GameScene implements Scene {
  readonly name = 'game';
  private elapsed = 0;
  private onMenu: () => void;

  constructor(onMenu: () => void) {
    this.onMenu = onMenu;
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

    // Eyes
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

    // HUD
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Game Scene - Your pet lives here!', 16, 30);
    ctx.textAlign = 'right';
    ctx.fillText('ESC = Menu', width - 16, 30);
  }
}
