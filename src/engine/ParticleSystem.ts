/**
 * Particle system for visual effects.
 * Handles evolution sparkles, healing shimmer, weather particles, and cooking steam.
 */

export type ParticleEffectType =
  | 'evolution'
  | 'healing'
  | 'cooking'
  | 'rain'
  | 'snow'
  | 'wind_leaves'
  | 'sparkle'
  | 'hearts'
  | 'coins';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: ParticleEffectType;
  rotation: number;
  rotationSpeed: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];

  emit(
    type: ParticleEffectType,
    x: number,
    y: number,
    count = 10,
  ): void {
    const configs = EFFECT_CONFIGS[type];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * configs.spread,
        y: y + (Math.random() - 0.5) * configs.spread,
        vx: (Math.random() - 0.5) * configs.speed,
        vy: configs.gravity
          ? -Math.random() * configs.speed
          : (Math.random() - 0.5) * configs.speed,
        life: configs.life + Math.random() * configs.lifeVariance,
        maxLife: configs.life + Math.random() * configs.lifeVariance,
        size: configs.size + Math.random() * configs.sizeVariance,
        color: configs.colors[Math.floor(Math.random() * configs.colors.length)],
        type,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 2,
      });
    }
  }

  /** Continuously emit weather particles across the screen. */
  emitWeather(
    type: 'rain' | 'snow' | 'wind_leaves',
    screenWidth: number,
    count = 1,
  ): void {
    for (let i = 0; i < count; i++) {
      this.emit(type, Math.random() * screenWidth, -10, 1);
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.rotation += p.rotationSpeed * dt;

      const cfg = EFFECT_CONFIGS[p.type];
      if (cfg.gravity) {
        p.vy += cfg.gravityStrength * dt * 60;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = Math.min(1, p.life / (p.maxLife * 0.3));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      switch (p.type) {
        case 'evolution':
        case 'sparkle':
          this.drawSparkle(ctx, p.size);
          break;
        case 'healing':
          this.drawPlus(ctx, p.size);
          break;
        case 'hearts':
          this.drawHeart(ctx, p.size);
          break;
        case 'coins':
          this.drawCoin(ctx, p.size);
          break;
        case 'rain':
          this.drawRaindrop(ctx, p.size);
          break;
        case 'snow':
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'wind_leaves':
          this.drawLeaf(ctx, p.size);
          break;
        case 'cooking':
          this.drawSteam(ctx, p.size);
          break;
        default:
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
      }

      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  get count(): number {
    return this.particles.length;
  }

  clear(): void {
    this.particles.length = 0;
  }

  private drawSparkle(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
    }
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawPlus(ctx: CanvasRenderingContext2D, size: number): void {
    const w = size * 0.35;
    ctx.fillRect(-w, -size, w * 2, size * 2);
    ctx.fillRect(-size, -w, size * 2, w * 2);
  }

  private drawHeart(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.beginPath();
    ctx.moveTo(0, size * 0.4);
    ctx.bezierCurveTo(-size, -size * 0.2, -size * 0.3, -size, 0, -size * 0.4);
    ctx.bezierCurveTo(size * 0.3, -size, size, -size * 0.2, 0, size * 0.4);
    ctx.fill();
  }

  private drawCoin(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawRaindrop(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.3, size * 0.3);
    ctx.arc(0, size * 0.3, size * 0.3, 0, Math.PI, false);
    ctx.closePath();
    ctx.fill();
  }

  private drawLeaf(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2d5a27';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.lineTo(size, 0);
    ctx.stroke();
  }

  private drawSteam(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

interface EffectConfig {
  spread: number;
  speed: number;
  life: number;
  lifeVariance: number;
  size: number;
  sizeVariance: number;
  colors: string[];
  gravity: boolean;
  gravityStrength: number;
}

const EFFECT_CONFIGS: Record<ParticleEffectType, EffectConfig> = {
  evolution: {
    spread: 60,
    speed: 3,
    life: 1.5,
    lifeVariance: 0.5,
    size: 4,
    sizeVariance: 2,
    colors: ['#ffd700', '#fff', '#f97316', '#a78bfa', '#4ecca3'],
    gravity: false,
    gravityStrength: 0,
  },
  healing: {
    spread: 30,
    speed: 1.5,
    life: 1.0,
    lifeVariance: 0.3,
    size: 3,
    sizeVariance: 1,
    colors: ['#4ecca3', '#7fffcf', '#fff'],
    gravity: false,
    gravityStrength: 0,
  },
  cooking: {
    spread: 20,
    speed: 0.8,
    life: 1.2,
    lifeVariance: 0.4,
    size: 5,
    sizeVariance: 3,
    colors: ['rgba(255,255,255,0.4)', 'rgba(200,200,200,0.3)'],
    gravity: false,
    gravityStrength: -0.02,
  },
  rain: {
    spread: 5,
    speed: 6,
    life: 1.5,
    lifeVariance: 0.3,
    size: 2,
    sizeVariance: 1,
    colors: ['#87ceeb', '#6ab0d6'],
    gravity: true,
    gravityStrength: 0.15,
  },
  snow: {
    spread: 10,
    speed: 1,
    life: 3,
    lifeVariance: 1,
    size: 3,
    sizeVariance: 2,
    colors: ['#fff', '#e0f2fe', '#d1d5db'],
    gravity: true,
    gravityStrength: 0.02,
  },
  wind_leaves: {
    spread: 15,
    speed: 2.5,
    life: 2,
    lifeVariance: 0.8,
    size: 4,
    sizeVariance: 2,
    colors: ['#4ecca3', '#fbbf24', '#f97316', '#dc2626'],
    gravity: true,
    gravityStrength: 0.03,
  },
  sparkle: {
    spread: 40,
    speed: 2,
    life: 0.8,
    lifeVariance: 0.3,
    size: 3,
    sizeVariance: 2,
    colors: ['#ffd700', '#fff', '#fbbf24'],
    gravity: false,
    gravityStrength: 0,
  },
  hearts: {
    spread: 30,
    speed: 1.5,
    life: 1.2,
    lifeVariance: 0.4,
    size: 5,
    sizeVariance: 2,
    colors: ['#ff6b9d', '#e94560', '#ff9bc1'],
    gravity: false,
    gravityStrength: -0.02,
  },
  coins: {
    spread: 25,
    speed: 2,
    life: 1.0,
    lifeVariance: 0.3,
    size: 4,
    sizeVariance: 1,
    colors: ['#ffd700', '#f59e0b'],
    gravity: true,
    gravityStrength: 0.05,
  },
};
