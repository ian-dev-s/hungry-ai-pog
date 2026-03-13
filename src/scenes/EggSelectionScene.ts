/**
 * Scene for choosing an egg elemental type.
 * Displays all six egg categories with descriptions
 * and transitions to the EggNurturingScene on selection.
 */

import type { Scene } from '@engine/SceneManager';
import type { Renderer } from '@engine/Renderer';
import { ALL_EGG_ELEMENTS, EGG_TYPES, type EggElement } from '@data/EggConfig';

export class EggSelectionScene implements Scene {
  readonly name = 'eggSelection';
  private elapsed = 0;
  private selectedIndex = 0;
  private onSelect: (element: EggElement) => void;
  private onBack: () => void;

  constructor(onSelect: (element: EggElement) => void, onBack: () => void) {
    this.onSelect = onSelect;
    this.onBack = onBack;
  }

  enter(): void {
    this.elapsed = 0;
    this.selectedIndex = 0;
    document.addEventListener('keydown', this.handleKey);
    document.addEventListener('click', this.handleClick);
  }

  exit(): void {
    document.removeEventListener('keydown', this.handleKey);
    document.removeEventListener('click', this.handleClick);
  }

  private handleKey = (e: KeyboardEvent): void => {
    if (e.key === 'ArrowUp' || e.key === 'w') {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    } else if (e.key === 'ArrowDown' || e.key === 's') {
      this.selectedIndex = Math.min(ALL_EGG_ELEMENTS.length - 1, this.selectedIndex + 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      this.confirmSelection();
    } else if (e.key === 'Escape') {
      this.onBack();
    }
  };

  private handleClick = (e: MouseEvent): void => {
    // Determine which egg was clicked based on y position
    const canvas = (e.target as HTMLElement)?.closest?.('canvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const startY = 90;
    const rowHeight = 80;

    for (let i = 0; i < ALL_EGG_ELEMENTS.length; i++) {
      const itemY = startY + i * rowHeight;
      if (y >= itemY && y < itemY + rowHeight) {
        this.selectedIndex = i;
        this.confirmSelection();
        return;
      }
    }
  };

  private confirmSelection(): void {
    const element = ALL_EGG_ELEMENTS[this.selectedIndex];
    this.onSelect(element);
  }

  update(dt: number): void {
    this.elapsed += dt;
  }

  render(renderer: Renderer): void {
    renderer.clear('#0d1b2a');
    const { ctx, width } = renderer;

    // Title
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Choose Your Egg', width / 2, 40);

    ctx.font = '12px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText('Up/Down to browse, Enter to select, ESC to go back', width / 2, 68);

    // Egg list
    const startY = 90;
    const rowHeight = 80;

    for (let i = 0; i < ALL_EGG_ELEMENTS.length; i++) {
      const element = ALL_EGG_ELEMENTS[i];
      const config = EGG_TYPES[element];
      const y = startY + i * rowHeight;
      const isSelected = i === this.selectedIndex;

      // Highlight selected row
      if (isSelected) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(16, y, width - 32, rowHeight - 8);

        // Selection indicator
        ctx.fillStyle = config.accentColor;
        ctx.fillRect(16, y, 4, rowHeight - 8);
      }

      // Egg icon (simple oval)
      const eggX = 50;
      const eggY = y + (rowHeight - 8) / 2;
      ctx.fillStyle = config.baseColor;
      ctx.beginPath();
      ctx.ellipse(eggX, eggY, 14, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glow on selected
      if (isSelected && Math.floor(this.elapsed * 3) % 2 === 0) {
        ctx.strokeStyle = config.accentColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(eggX, eggY, 17, 21, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Name
      ctx.fillStyle = isSelected ? '#ffffff' : '#c0c0c0';
      ctx.font = isSelected ? 'bold 16px monospace' : '16px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(config.name, 80, y + 22);

      // Description
      ctx.fillStyle = isSelected ? '#aaa' : '#666';
      ctx.font = '11px monospace';
      ctx.fillText(config.description, 80, y + 42);

      // Element tag
      ctx.fillStyle = config.accentColor;
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(element.toUpperCase(), width - 24, y + 22);
    }
  }
}
