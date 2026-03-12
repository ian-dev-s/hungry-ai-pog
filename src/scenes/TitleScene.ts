import type { Scene } from '@engine/SceneManager';
import type { Renderer } from '@engine/Renderer';

export class TitleScene implements Scene {
  readonly name = 'title';
  private elapsed = 0;
  private onStart: () => void;

  constructor(onStart: () => void) {
    this.onStart = onStart;
  }

  enter(): void {
    this.elapsed = 0;
    document.addEventListener('click', this.handleClick);
    document.addEventListener('keydown', this.handleKey);
  }

  exit(): void {
    document.removeEventListener('click', this.handleClick);
    document.removeEventListener('keydown', this.handleKey);
  }

  private handleClick = (): void => {
    this.onStart();
  };

  private handleKey = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') this.onStart();
  };

  update(dt: number): void {
    this.elapsed += dt;
  }

  render(renderer: Renderer): void {
    renderer.clear('#1a1a2e');
    const { ctx, width, height } = renderer;

    // Title
    ctx.fillStyle = '#e94560';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Hungry AI Pog', width / 2, height / 3);

    // Subtitle
    ctx.fillStyle = '#16213e';
    ctx.font = '16px monospace';
    ctx.fillText('Virtual Pet Simulator', width / 2, height / 3 + 44);

    // Blinking prompt
    if (Math.floor(this.elapsed * 2) % 2 === 0) {
      ctx.fillStyle = '#e0e0e0';
      ctx.font = '18px monospace';
      ctx.fillText('Click or press Enter to start', width / 2, height * 0.65);
    }
  }
}
