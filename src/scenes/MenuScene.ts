import type { Scene } from '@engine/SceneManager';
import type { Renderer } from '@engine/Renderer';

interface MenuItem {
  label: string;
  action: () => void;
}

export class MenuScene implements Scene {
  readonly name = 'menu';
  private items: MenuItem[] = [];
  private selectedIndex = 0;

  constructor(onResume: () => void, onTitle: () => void) {
    this.items = [
      { label: 'Resume', action: onResume },
      { label: 'Back to Title', action: onTitle },
    ];
  }

  enter(): void {
    this.selectedIndex = 0;
    document.addEventListener('keydown', this.handleKey);
    document.addEventListener('click', this.handleClick);
  }

  exit(): void {
    document.removeEventListener('keydown', this.handleKey);
    document.removeEventListener('click', this.handleClick);
  }

  private handleKey = (e: KeyboardEvent): void => {
    if (e.key === 'ArrowUp') {
      this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
    } else if (e.key === 'ArrowDown') {
      this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
    } else if (e.key === 'Enter') {
      this.items[this.selectedIndex].action();
    } else if (e.key === 'Escape') {
      this.items[0].action(); // Resume
    }
  };

  private handleClick = (): void => {
    this.items[this.selectedIndex].action();
  };

  update(_dt: number): void {}

  render(renderer: Renderer): void {
    renderer.clear('#16213e');
    const { ctx, width, height } = renderer;

    ctx.fillStyle = '#e94560';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Menu', width / 2, height / 4);

    this.items.forEach((item, i) => {
      const y = height / 2 + i * 48;
      const selected = i === this.selectedIndex;

      ctx.fillStyle = selected ? '#e94560' : '#e0e0e0';
      ctx.font = `${selected ? 'bold ' : ''}20px monospace`;
      ctx.fillText(`${selected ? '> ' : '  '}${item.label}`, width / 2, y);
    });

    ctx.fillStyle = '#666';
    ctx.font = '14px monospace';
    ctx.fillText('Arrow keys + Enter to select', width / 2, height * 0.8);
  }
}
