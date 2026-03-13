/**
 * Scene for interacting with the egg pre-hatch.
 * Players can tap, warm, and talk to the egg.
 * The egg visually responds with wobble, glow, and cracks based on hatch progress.
 * When ready, triggers the hatching sequence.
 */

import type { Scene } from '@engine/SceneManager';
import type { Renderer } from '@engine/Renderer';
import { EGG_TYPES, type EggInteractionType } from '@data/EggConfig';
import { EggHatchingSystem } from '@systems/EggHatchingSystem';

export class EggNurturingScene implements Scene {
  readonly name = 'eggNurturing';
  private elapsed = 0;
  private eggSystem: EggHatchingSystem;
  private onHatch: () => void;
  private onBack: () => void;
  private feedbackText = '';
  private feedbackTimer = 0;
  private hatchAnimating = false;
  private hatchAnimTimer = 0;
  private static readonly HATCH_ANIM_DURATION = 3.0;

  constructor(
    eggSystem: EggHatchingSystem,
    onHatch: () => void,
    onBack: () => void,
  ) {
    this.eggSystem = eggSystem;
    this.onHatch = onHatch;
    this.onBack = onBack;
  }

  enter(): void {
    this.elapsed = 0;
    this.feedbackText = '';
    this.feedbackTimer = 0;
    this.hatchAnimating = false;
    this.hatchAnimTimer = 0;
    document.addEventListener('keydown', this.handleKey);
    document.addEventListener('click', this.handleClick);
  }

  exit(): void {
    document.removeEventListener('keydown', this.handleKey);
    document.removeEventListener('click', this.handleClick);
  }

  private handleKey = (e: KeyboardEvent): void => {
    if (this.hatchAnimating) return;
    if (e.key === '1' || e.key === 't') {
      this.doInteraction('tap');
    } else if (e.key === '2' || e.key === 'w') {
      this.doInteraction('warm');
    } else if (e.key === '3' || e.key === 'k') {
      this.doInteraction('talk');
    } else if (e.key === 'Enter' || e.key === ' ') {
      this.tryHatch();
    } else if (e.key === 'Escape') {
      this.onBack();
    }
  };

  private handleClick = (e: MouseEvent): void => {
    if (this.hatchAnimating) return;
    const canvas = (e.target as HTMLElement)?.closest?.('canvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const canvasWidth = rect.width;

    // Check button regions (bottom area)
    const buttonY = rect.height - 100;
    if (y >= buttonY && y <= buttonY + 40) {
      const buttonWidth = canvasWidth / 3;
      if (x < buttonWidth) {
        this.doInteraction('tap');
      } else if (x < buttonWidth * 2) {
        this.doInteraction('warm');
      } else {
        this.doInteraction('talk');
      }
      return;
    }

    // Click on egg area = tap
    const eggCenterY = rect.height * 0.4;
    const eggCenterX = canvasWidth / 2;
    const dx = x - eggCenterX;
    const dy = y - eggCenterY;
    if (dx * dx + dy * dy < 80 * 80) {
      this.doInteraction('tap');
    }
  };

  private doInteraction(type: EggInteractionType): void {
    const now = Date.now();
    const applied = this.eggSystem.interact(type, now);

    if (applied) {
      const ready = this.eggSystem.isInteractionReady(type, now);
      const labels: Record<EggInteractionType, string> = {
        tap: 'Tap!',
        warm: 'Warm...',
        talk: 'Talk...',
      };
      this.feedbackText = ready ? labels[type] : `${labels[type]} (cooling down)`;
      this.feedbackTimer = 1.5;

      if (this.eggSystem.isReadyToHatch(now)) {
        this.feedbackText = 'The egg is ready to hatch! Press Enter!';
        this.feedbackTimer = 5;
      }
    }
  }

  private tryHatch(): void {
    if (this.eggSystem.isReadyToHatch()) {
      this.hatchAnimating = true;
      this.hatchAnimTimer = 0;
    } else {
      this.feedbackText = 'Not ready yet... keep nurturing!';
      this.feedbackTimer = 2;
    }
  }

  update(dt: number): void {
    this.elapsed += dt;
    if (this.feedbackTimer > 0) {
      this.feedbackTimer -= dt;
      if (this.feedbackTimer <= 0) {
        this.feedbackText = '';
      }
    }
    if (this.hatchAnimating) {
      this.hatchAnimTimer += dt;
      if (this.hatchAnimTimer >= EggNurturingScene.HATCH_ANIM_DURATION) {
        this.hatchAnimating = false;
        this.onHatch();
      }
    }
  }

  render(renderer: Renderer): void {
    const state = this.eggSystem.getState();
    if (!state) return;

    const config = EGG_TYPES[state.element];
    const progress = this.eggSystem.getHatchProgress();
    const visual = this.eggSystem.getVisualStage();

    renderer.clear('#0d1b2a');
    const { ctx, width, height } = renderer;

    if (this.hatchAnimating) {
      this.renderHatchAnimation(ctx, width, height, config);
      return;
    }

    // Title
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.name, width / 2, 30);

    // Progress bar
    const barWidth = width - 80;
    const barX = 40;
    const barY = 55;
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, 12);
    ctx.fillStyle = config.accentColor;
    ctx.fillRect(barX, barY, barWidth * progress, 12);

    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.fillText(`${Math.floor(progress * 100)}% - ${visual.label}`, width / 2, barY + 26);

    // Egg rendering
    const eggX = width / 2;
    const eggY = height * 0.4;
    const eggRx = 45;
    const eggRy = 58;

    // Wobble animation
    let wobbleOffset = 0;
    if (visual.wobble) {
      wobbleOffset = Math.sin(this.elapsed * 4) * 3 * progress;
    }

    // Glow effect
    if (visual.glow) {
      const glowAlpha = 0.3 + 0.2 * Math.sin(this.elapsed * 2);
      ctx.fillStyle = config.accentColor + Math.floor(glowAlpha * 255).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.ellipse(eggX + wobbleOffset, eggY, eggRx + 12, eggRy + 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Egg body
    ctx.fillStyle = config.baseColor;
    ctx.beginPath();
    ctx.ellipse(eggX + wobbleOffset, eggY, eggRx, eggRy, 0, 0, Math.PI * 2);
    ctx.fill();

    // Accent pattern (spots)
    ctx.fillStyle = config.accentColor;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.ellipse(eggX + wobbleOffset - 15, eggY - 20, 8, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(eggX + wobbleOffset + 18, eggY - 5, 6, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(eggX + wobbleOffset - 5, eggY + 20, 7, 5, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Cracks
    if (visual.cracks >= 1) {
      this.drawCrack(ctx, eggX + wobbleOffset + 10, eggY - 25, 20);
    }
    if (visual.cracks >= 2) {
      this.drawCrack(ctx, eggX + wobbleOffset - 15, eggY + 10, 18);
    }
    if (visual.cracks >= 3) {
      this.drawCrack(ctx, eggX + wobbleOffset + 5, eggY + 5, 25);
    }

    // Interaction stats
    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Interactions: ${state.totalInteractions}`, width / 2, eggY + eggRy + 30);

    // Feedback text
    if (this.feedbackText) {
      ctx.fillStyle = config.accentColor;
      ctx.font = 'bold 14px monospace';
      ctx.fillText(this.feedbackText, width / 2, eggY + eggRy + 55);
    }

    // Interaction buttons
    this.renderButtons(ctx, width, height, config.accentColor);

    // Controls hint
    ctx.fillStyle = '#555';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('1/T=Tap  2/W=Warm  3/K=Talk  Enter=Hatch  ESC=Back', width / 2, height - 16);
  }

  private renderHatchAnimation(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: { baseColor: string; accentColor: string; name: string },
  ): void {
    const t = this.hatchAnimTimer / EggNurturingScene.HATCH_ANIM_DURATION;
    const eggX = width / 2;
    const eggY = height * 0.4;

    // Phase 1 (0-0.5): violent shaking and cracking
    if (t < 0.5) {
      const shakeIntensity = t * 20;
      const shake = Math.sin(this.elapsed * 30) * shakeIntensity;

      // Glow expands
      const glowSize = 60 + t * 40;
      ctx.fillStyle = config.accentColor + '40';
      ctx.beginPath();
      ctx.ellipse(eggX + shake, eggY, glowSize, glowSize, 0, 0, Math.PI * 2);
      ctx.fill();

      // Egg body
      ctx.fillStyle = config.baseColor;
      ctx.beginPath();
      ctx.ellipse(eggX + shake, eggY, 45, 58, 0, 0, Math.PI * 2);
      ctx.fill();

      // Many cracks
      const crackCount = Math.floor(t * 10) + 3;
      for (let i = 0; i < crackCount; i++) {
        const angle = (i / crackCount) * Math.PI * 2;
        const cx = eggX + shake + Math.cos(angle) * 20;
        const cy = eggY + Math.sin(angle) * 25;
        this.drawCrack(ctx, cx, cy, 15 + t * 20);
      }
    }
    // Phase 2 (0.5-0.8): egg splits apart with bright flash
    else if (t < 0.8) {
      const splitT = (t - 0.5) / 0.3;

      // Bright flash
      const flashAlpha = Math.max(0, 1 - splitT * 2);
      if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
        ctx.fillRect(0, 0, width, height);
      }

      // Shell fragments fly apart
      const spread = splitT * 80;
      ctx.globalAlpha = 1 - splitT;
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + splitT * 0.5;
        const fx = eggX + Math.cos(angle) * spread;
        const fy = eggY + Math.sin(angle) * spread - splitT * 30;
        ctx.fillStyle = config.baseColor;
        ctx.beginPath();
        ctx.ellipse(fx, fy, 12 - splitT * 8, 16 - splitT * 10, angle, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // New blob creature emerging
      const blobAlpha = splitT;
      const blobSize = 20 + splitT * 15;
      ctx.globalAlpha = blobAlpha;
      ctx.fillStyle = config.accentColor;
      ctx.beginPath();
      const blobY = eggY + Math.sin(this.elapsed * 3) * 3;
      ctx.arc(eggX, blobY, blobSize, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eggX - 7, blobY - 5, 4, 0, Math.PI * 2);
      ctx.arc(eggX + 7, blobY - 5, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.arc(eggX - 7, blobY - 5, 2, 0, Math.PI * 2);
      ctx.arc(eggX + 7, blobY - 5, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Phase 3 (0.8-1.0): blob bounces happily
    else {
      const bounceT = (t - 0.8) / 0.2;
      const blobSize = 35;
      const bounce = Math.abs(Math.sin(bounceT * Math.PI * 4)) * 15;
      const blobY = eggY - bounce;

      // Glow aura
      ctx.fillStyle = config.accentColor + '30';
      ctx.beginPath();
      ctx.arc(eggX, blobY, blobSize + 15, 0, Math.PI * 2);
      ctx.fill();

      // Blob body
      ctx.fillStyle = config.accentColor;
      ctx.beginPath();
      ctx.arc(eggX, blobY, blobSize, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eggX - 10, blobY - 8, 6, 0, Math.PI * 2);
      ctx.arc(eggX + 10, blobY - 8, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.arc(eggX - 10, blobY - 8, 3, 0, Math.PI * 2);
      ctx.arc(eggX + 10, blobY - 8, 3, 0, Math.PI * 2);
      ctx.fill();

      // Smile
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(eggX, blobY, 10, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    }

    // Hatching text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const messages = ['Cracking...', 'Hatching!', `Welcome, little ${config.name.split(' ')[0]}!`];
    const msgIdx = t < 0.5 ? 0 : t < 0.8 ? 1 : 2;
    ctx.fillText(messages[msgIdx], width / 2, height * 0.78);
  }

  private drawCrack(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
  ): void {
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + size * 0.3, y + size * 0.4);
    ctx.lineTo(x - size * 0.2, y + size * 0.7);
    ctx.lineTo(x + size * 0.1, y + size);
    ctx.stroke();
  }

  private renderButtons(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    accentColor: string,
  ): void {
    const buttonY = height - 100;
    const buttonWidth = (width - 64) / 3;
    const buttonHeight = 36;
    const labels = ['Tap', 'Warm', 'Talk'];
    const icons = ['[1]', '[2]', '[3]'];

    for (let i = 0; i < 3; i++) {
      const x = 24 + i * (buttonWidth + 8);

      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, buttonY, buttonWidth, buttonHeight);

      ctx.fillStyle = '#e0e0e0';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `${icons[i]} ${labels[i]}`,
        x + buttonWidth / 2,
        buttonY + buttonHeight / 2,
      );
    }
  }
}
