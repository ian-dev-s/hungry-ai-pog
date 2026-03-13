/**
 * Procedural pixel-art sprite system.
 * Draws animated pet sprites on canvas for each life stage and animation state.
 * Runs at 60fps with frame-based animation cycling.
 */

import {
  type PetAnimState,
  type LifeStageSprite,
  type ElementColors,
  ELEMENT_COLORS,
  STAGE_DIMENSIONS,
  ANIM_FRAME_COUNTS,
  ANIM_SPEED,
  getLifeStageSprite,
} from '@data/SpriteConfig';

export class SpriteSystem {
  private currentState: PetAnimState = 'idle';
  private frameIndex = 0;
  private frameTick = 0;
  private elapsed = 0;

  setState(state: PetAnimState): void {
    if (state !== this.currentState) {
      this.currentState = state;
      this.frameIndex = 0;
      this.frameTick = 0;
    }
  }

  getState(): PetAnimState {
    return this.currentState;
  }

  update(dt: number): void {
    this.elapsed += dt;
    this.frameTick++;

    const speed = ANIM_SPEED[this.currentState];
    if (this.frameTick >= speed) {
      this.frameTick = 0;
      const totalFrames = ANIM_FRAME_COUNTS[this.currentState];
      this.frameIndex = (this.frameIndex + 1) % totalFrames;
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    lifeStage: string,
    elementType: string,
  ): void {
    const stage = getLifeStageSprite(lifeStage);
    const colors = ELEMENT_COLORS[elementType] ?? ELEMENT_COLORS['forest'];
    const dims = STAGE_DIMENSIONS[stage];

    ctx.save();

    const { yOffset, rotation, bodyScale } = this.getFrameParams(stage);
    ctx.translate(cx, cy + yOffset);
    ctx.rotate(rotation);
    ctx.scale(bodyScale, bodyScale);

    this.drawBody(ctx, stage, colors, dims.width, dims.height);
    this.drawEyes(ctx, stage, colors, dims.eyeSize);
    this.drawMouth(ctx, stage, colors, dims.eyeSize);
    this.drawAppendages(ctx, stage, colors, dims.width, dims.height);
    this.drawStateOverlay(ctx, stage, colors, dims.width, dims.height);

    ctx.restore();
  }

  private getFrameParams(stage: LifeStageSprite): {
    yOffset: number;
    rotation: number;
    bodyScale: number;
  } {
    const t = this.elapsed;
    const f = this.frameIndex;

    switch (this.currentState) {
      case 'idle':
        return {
          yOffset: Math.sin(t * 2) * 4,
          rotation: 0,
          bodyScale: 1 + Math.sin(t * 3) * 0.02,
        };
      case 'eating':
        return {
          yOffset: f % 2 === 0 ? -2 : 2,
          rotation: 0,
          bodyScale: 1 + (f % 3 === 0 ? 0.05 : 0),
        };
      case 'playing':
        return {
          yOffset: -Math.abs(Math.sin(t * 5)) * 20,
          rotation: Math.sin(t * 4) * 0.15,
          bodyScale: 1,
        };
      case 'sleeping':
        return {
          yOffset: 8 + Math.sin(t * 0.8) * 2,
          rotation: stage === 'blob' ? 0 : 0.05,
          bodyScale: 1 + Math.sin(t * 0.8) * 0.03,
        };
      case 'sick':
        return {
          yOffset: 3 + Math.sin(t * 1.5) * 2,
          rotation: Math.sin(t * 2) * 0.05,
          bodyScale: 0.97,
        };
      case 'happy':
        return {
          yOffset: -Math.abs(Math.sin(t * 4)) * 10,
          rotation: Math.sin(t * 6) * 0.1,
          bodyScale: 1 + Math.sin(t * 4) * 0.04,
        };
      case 'sad':
        return {
          yOffset: 5,
          rotation: 0,
          bodyScale: 0.95 + Math.sin(t * 1) * 0.01,
        };
    }
  }

  private drawBody(
    ctx: CanvasRenderingContext2D,
    stage: LifeStageSprite,
    colors: ElementColors,
    w: number,
    h: number,
  ): void {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, h * 0.5, w * 0.4, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main body
    ctx.fillStyle = colors.body;
    ctx.beginPath();
    if (stage === 'blob') {
      // Simple round blob
      ctx.ellipse(0, 0, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
    } else if (stage === 'juvenile') {
      // Slightly elongated with flatter bottom
      ctx.ellipse(0, -2, w * 0.5, h * 0.48, 0, 0, Math.PI * 2);
    } else {
      // Taller body for adolescent/adult/elder
      ctx.ellipse(0, -4, w * 0.45, h * 0.5, 0, 0, Math.PI * 2);
    }
    ctx.fill();

    // Body highlight
    ctx.fillStyle = colors.highlight;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.ellipse(-w * 0.12, -h * 0.2, w * 0.18, h * 0.22, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Belly spot for juvenile+
    if (stage !== 'blob') {
      ctx.fillStyle = colors.accent;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.ellipse(0, h * 0.08, w * 0.25, h * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private drawEyes(
    ctx: CanvasRenderingContext2D,
    stage: LifeStageSprite,
    colors: ElementColors,
    eyeSize: number,
  ): void {
    const spread = stage === 'blob' ? 8 : 12;
    const eyeY = stage === 'blob' ? -4 : -10;

    const eyeState = this.getEyeState();

    if (eyeState === 'closed') {
      // Closed eyes (lines)
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-spread - eyeSize * 0.6, eyeY);
      ctx.lineTo(-spread + eyeSize * 0.6, eyeY);
      ctx.moveTo(spread - eyeSize * 0.6, eyeY);
      ctx.lineTo(spread + eyeSize * 0.6, eyeY);
      ctx.stroke();
      return;
    }

    if (eyeState === 'x') {
      // X eyes (sick)
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      const s = eyeSize * 0.5;
      for (const sx of [-spread, spread]) {
        ctx.beginPath();
        ctx.moveTo(sx - s, eyeY - s);
        ctx.lineTo(sx + s, eyeY + s);
        ctx.moveTo(sx + s, eyeY - s);
        ctx.lineTo(sx - s, eyeY + s);
        ctx.stroke();
      }
      return;
    }

    const h = eyeState === 'half' ? eyeSize * 0.4 : eyeSize;

    // Eye whites
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(-spread, eyeY, eyeSize, h, 0, 0, Math.PI * 2);
    ctx.ellipse(spread, eyeY, eyeSize, h, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    const pupilOffset = Math.sin(this.elapsed * 0.7) * 1.5;
    ctx.fillStyle = colors.shadow;
    ctx.beginPath();
    ctx.arc(-spread + pupilOffset, eyeY, eyeSize * 0.45, 0, Math.PI * 2);
    ctx.arc(spread + pupilOffset, eyeY, eyeSize * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // Eye sparkle
    if (eyeState === 'sparkle') {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-spread - 1, eyeY - 2, eyeSize * 0.2, 0, Math.PI * 2);
      ctx.arc(spread - 1, eyeY - 2, eyeSize * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawMouth(
    ctx: CanvasRenderingContext2D,
    stage: LifeStageSprite,
    colors: ElementColors,
    eyeSize: number,
  ): void {
    const mouthY = stage === 'blob' ? 6 : 4;
    const mouthState = this.getMouthState();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;

    switch (mouthState) {
      case 'smile':
        ctx.beginPath();
        ctx.arc(0, mouthY - 2, eyeSize * 0.8, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
        break;
      case 'open':
        ctx.fillStyle = colors.shadow;
        ctx.beginPath();
        ctx.ellipse(0, mouthY, eyeSize * 0.5, eyeSize * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'frown':
        ctx.beginPath();
        ctx.arc(0, mouthY + 6, eyeSize * 0.7, 1.2 * Math.PI, 1.8 * Math.PI);
        ctx.stroke();
        break;
      case 'o':
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(0, mouthY, eyeSize * 0.35, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'none':
        break;
    }
  }

  private drawAppendages(
    ctx: CanvasRenderingContext2D,
    stage: LifeStageSprite,
    colors: ElementColors,
    w: number,
    h: number,
  ): void {
    if (stage === 'blob') return;

    const t = this.elapsed;
    const wavePhase = this.currentState === 'happy' ? Math.sin(t * 6) * 0.4 : Math.sin(t * 2) * 0.15;

    // Ears/horns for adolescent+
    if (stage !== 'juvenile') {
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.moveTo(-w * 0.3, -h * 0.45);
      ctx.lineTo(-w * 0.2, -h * 0.7);
      ctx.lineTo(-w * 0.05, -h * 0.42);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(w * 0.3, -h * 0.45);
      ctx.lineTo(w * 0.2, -h * 0.7);
      ctx.lineTo(w * 0.05, -h * 0.42);
      ctx.closePath();
      ctx.fill();
    }

    // Arms/flippers for juvenile+
    ctx.save();
    ctx.fillStyle = colors.body;

    // Left arm
    ctx.save();
    ctx.translate(-w * 0.45, -2);
    ctx.rotate(-0.3 + wavePhase);
    ctx.beginPath();
    ctx.ellipse(0, 8, 5, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Right arm
    ctx.save();
    ctx.translate(w * 0.45, -2);
    ctx.rotate(0.3 - wavePhase);
    ctx.beginPath();
    ctx.ellipse(0, 8, 5, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // Feet for adolescent+
    if (stage !== 'juvenile') {
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.ellipse(-w * 0.2, h * 0.42, 8, 4, 0, 0, Math.PI * 2);
      ctx.ellipse(w * 0.2, h * 0.42, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tail for adult/elder
    if (stage === 'adult' || stage === 'elder') {
      const tailWave = Math.sin(t * 3) * 8;
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(w * 0.4, h * 0.2);
      ctx.quadraticCurveTo(w * 0.6 + tailWave, h * 0.1, w * 0.5 + tailWave, -h * 0.1);
      ctx.stroke();
    }
  }

  private drawStateOverlay(
    ctx: CanvasRenderingContext2D,
    _stage: LifeStageSprite,
    colors: ElementColors,
    w: number,
    h: number,
  ): void {
    const t = this.elapsed;

    switch (this.currentState) {
      case 'sleeping': {
        // Z's floating up
        ctx.fillStyle = '#e0e0e0';
        ctx.globalAlpha = 0.6;
        ctx.font = 'bold 14px monospace';
        for (let i = 0; i < 3; i++) {
          const phase = (t * 0.5 + i * 0.4) % 1.5;
          const zx = w * 0.3 + i * 8 + Math.sin(t + i) * 4;
          const zy = -h * 0.3 - phase * 40;
          const alpha = 1 - phase / 1.5;
          ctx.globalAlpha = alpha * 0.6;
          ctx.fillText('z', zx, zy);
        }
        ctx.globalAlpha = 1;
        break;
      }
      case 'sick': {
        // Green tint overlay
        ctx.fillStyle = 'rgba(76, 175, 80, 0.15)';
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Sweat drop
        const dropPhase = (t * 2) % 2;
        if (dropPhase < 1.5) {
          ctx.fillStyle = '#87ceeb';
          ctx.globalAlpha = 1 - dropPhase / 1.5;
          ctx.beginPath();
          ctx.moveTo(w * 0.35, -h * 0.3);
          ctx.quadraticCurveTo(w * 0.4, -h * 0.2 + dropPhase * 10, w * 0.35, -h * 0.15 + dropPhase * 10);
          ctx.quadraticCurveTo(w * 0.3, -h * 0.2 + dropPhase * 10, w * 0.35, -h * 0.3);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        break;
      }
      case 'happy': {
        // Sparkle particles
        for (let i = 0; i < 4; i++) {
          const angle = (t * 2 + i * Math.PI * 0.5) % (Math.PI * 2);
          const dist = w * 0.6 + Math.sin(t * 3 + i) * 5;
          const sx = Math.cos(angle) * dist;
          const sy = Math.sin(angle) * dist - h * 0.2;
          ctx.fillStyle = colors.highlight;
          ctx.globalAlpha = 0.4 + Math.sin(t * 4 + i) * 0.3;
          this.drawSparkle(ctx, sx, sy, 3);
        }
        ctx.globalAlpha = 1;
        break;
      }
      case 'sad': {
        // Tear drops
        for (let i = 0; i < 2; i++) {
          const side = i === 0 ? -1 : 1;
          const dropY = ((t * 1.5 + i * 0.5) % 1.2);
          ctx.fillStyle = '#87ceeb';
          ctx.globalAlpha = 1 - dropY / 1.2;
          ctx.beginPath();
          ctx.arc(side * 10, -2 + dropY * 20, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        break;
      }
    }
  }

  private drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.3, y - size * 0.3);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x + size * 0.3, y + size * 0.3);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size * 0.3, y + size * 0.3);
    ctx.lineTo(x - size, y);
    ctx.lineTo(x - size * 0.3, y - size * 0.3);
    ctx.closePath();
    ctx.fill();
  }

  private getEyeState(): 'open' | 'half' | 'closed' | 'sparkle' | 'x' {
    switch (this.currentState) {
      case 'sleeping':
        return 'closed';
      case 'sick':
        return 'x';
      case 'happy':
        return 'sparkle';
      case 'sad':
        return 'half';
      case 'eating':
        return this.frameIndex % 3 === 0 ? 'closed' : 'open';
      default:
        // Periodic blink
        return Math.floor(this.elapsed * 2) % 8 === 0 ? 'half' : 'open';
    }
  }

  private getMouthState(): 'none' | 'smile' | 'open' | 'frown' | 'o' {
    switch (this.currentState) {
      case 'eating':
        return this.frameIndex % 2 === 0 ? 'open' : 'none';
      case 'happy':
      case 'playing':
        return 'smile';
      case 'sad':
        return 'frown';
      case 'sick':
        return 'frown';
      case 'sleeping':
        return 'o';
      default:
        return 'smile';
    }
  }
}
