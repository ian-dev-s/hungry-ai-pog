import type { Scene } from '@engine/SceneManager';
import type { Renderer } from '@engine/Renderer';
import { SpriteSystem } from '@engine/SpriteSystem';
import { ParticleSystem } from '@engine/ParticleSystem';
import { AudioManager } from '@engine/AudioManager';
import { StatsEngine } from '../systems/StatsEngine';
import type { PetState } from '../data/SaveSchema';
import type { PetAnimState } from '../data/SpriteConfig';
import type { MusicMood } from '../data/AudioConfig';

export class GameScene implements Scene {
  readonly name = 'game';
  private elapsed = 0;
  private onMenu: () => void;
  private onKitchen: () => void;
  private statsEngine: StatsEngine;
  private pet: PetState | null = null;
  private spriteSystem: SpriteSystem;
  private particles: ParticleSystem;
  private audio: AudioManager;
  private audioInitialized = false;
  private lastMusicMood: MusicMood | null = null;
  private touchButtons: { label: string; key: string; x: number; y: number; w: number; h: number }[] = [];

  constructor(onMenu: () => void, onKitchen: () => void) {
    this.onMenu = onMenu;
    this.onKitchen = onKitchen;
    this.statsEngine = new StatsEngine();
    this.spriteSystem = new SpriteSystem();
    this.particles = new ParticleSystem();
    this.audio = new AudioManager();
  }

  getAudioManager(): AudioManager {
    return this.audio;
  }

  getParticleSystem(): ParticleSystem {
    return this.particles;
  }

  setPet(pet: PetState): void {
    this.pet = pet;
  }

  enter(): void {
    this.elapsed = 0;
    this.touchButtons = [];
    document.addEventListener('keydown', this.handleKey);
    document.addEventListener('click', this.handleClick);
    document.addEventListener('touchstart', this.handleTouch, { passive: true });
  }

  exit(): void {
    document.removeEventListener('keydown', this.handleKey);
    document.removeEventListener('click', this.handleClick);
    document.removeEventListener('touchstart', this.handleTouch);
  }

  private initAudio(): void {
    if (!this.audioInitialized) {
      this.audio.init();
      this.audioInitialized = true;
    }
  }

  private handleKey = (e: KeyboardEvent): void => {
    this.initAudio();
    if (e.key === 'Escape') {
      this.audio.playSfx('ui_back');
      this.onMenu();
    }
    if (e.key === 'k' || e.key === 'K') {
      this.audio.playSfx('ui_confirm');
      this.onKitchen();
    }
  };

  private handleClick = (e: MouseEvent): void => {
    this.initAudio();
    const canvas = (e.target as HTMLElement)?.closest?.('canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.handleInputAt(x, y);
  };

  private handleTouch = (e: TouchEvent): void => {
    this.initAudio();
    const touch = e.touches[0];
    if (!touch) return;
    const canvas = (touch.target as HTMLElement)?.closest?.('canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    this.handleInputAt(x, y);
  };

  private handleInputAt(x: number, y: number): void {
    for (const btn of this.touchButtons) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        this.audio.playSfx('ui_select');
        if (btn.key === 'menu') this.onMenu();
        else if (btn.key === 'kitchen') this.onKitchen();
        return;
      }
    }
  }

  update(dt: number): void {
    this.elapsed += dt;
    this.spriteSystem.update(dt);
    this.particles.update(dt);

    // Update sprite state based on pet
    if (this.pet) {
      this.spriteSystem.setState(this.derivePetAnimState(this.pet));
    }

    // Update music mood
    if (this.audio.isInitialized) {
      const mood = this.deriveMusicMood();
      if (mood !== this.lastMusicMood) {
        this.lastMusicMood = mood;
        this.audio.startMusic(mood);
      }
      this.audio.updateMusic(dt);
    }
  }

  render(renderer: Renderer): void {
    const { ctx, width, height } = renderer;

    // Background gradient based on time
    this.renderBackground(ctx, width, height);

    // Weather particles
    this.particles.render(ctx);

    // Pet sprite
    const petY = height * 0.45;
    if (this.pet) {
      this.spriteSystem.render(ctx, width / 2, petY, this.pet.lifeStage, this.pet.elementType);
    } else {
      // Fallback placeholder
      const y = petY + Math.sin(this.elapsed * 2) * 20;
      ctx.fillStyle = '#e94560';
      ctx.beginPath();
      ctx.arc(width / 2, y, 40, 0, Math.PI * 2);
      ctx.fill();
    }

    // Illness effects
    const isIll = this.pet && this.statsEngine.isIll(this.pet);
    const illnessInfo = this.pet ? this.statsEngine.getIllnessInfo(this.pet) : null;

    if (isIll && illnessInfo) {
      ctx.strokeStyle = this.getIllnessColor(illnessInfo.type);
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5 + Math.sin(this.elapsed * 4) * 0.3;
      ctx.beginPath();
      ctx.arc(width / 2, petY, 50 + Math.sin(this.elapsed * 3) * 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Particle overlay (on top of pet)
    this.particles.render(ctx);

    // HUD
    this.renderHUD(ctx, width, height, isIll ?? false, illnessInfo);

    // Touch-friendly buttons
    this.renderTouchButtons(ctx, width, height);
  }

  private renderBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const hour = new Date().getHours();
    let topColor: string;
    let bottomColor: string;

    if (hour >= 6 && hour < 12) {
      // Morning
      topColor = '#1a365d';
      bottomColor = '#0f3460';
    } else if (hour >= 12 && hour < 18) {
      // Afternoon
      topColor = '#0f3460';
      bottomColor = '#16213e';
    } else if (hour >= 18 && hour < 21) {
      // Evening
      topColor = '#1a1a3e';
      bottomColor = '#0d1b2a';
    } else {
      // Night
      topColor = '#0a0a1a';
      bottomColor = '#0d1b2a';
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, topColor);
    gradient.addColorStop(1, bottomColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Stars at night
    if (hour >= 21 || hour < 6) {
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 20; i++) {
        const sx = ((i * 73 + 17) % width);
        const sy = ((i * 41 + 11) % (height * 0.4));
        const twinkle = 0.3 + Math.sin(this.elapsed * 2 + i) * 0.3;
        ctx.globalAlpha = twinkle;
        ctx.beginPath();
        ctx.arc(sx, sy, 1 + (i % 2), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Ground
    ctx.fillStyle = '#1a2940';
    ctx.fillRect(0, height * 0.75, width, height * 0.25);
    ctx.fillStyle = '#152238';
    ctx.fillRect(0, height * 0.75, width, 2);
  }

  private renderHUD(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    isIll: boolean,
    illnessInfo: { type: string; name: string; progress: number } | null,
  ): void {
    // Semi-transparent HUD bar at top
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, width, 44);

    ctx.fillStyle = '#e0e0e0';
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    if (this.pet) {
      ctx.fillText(`${this.pet.name}`, 12, 16);
      ctx.fillStyle = '#888';
      ctx.font = '10px monospace';
      ctx.fillText(`${this.pet.lifeStage} | ${this.pet.elementType}`, 12, 32);
    } else {
      ctx.fillText('Your pet lives here!', 12, 22);
    }

    // Stat bars (compact)
    if (this.pet) {
      this.renderStatBars(ctx, width, height);
    }

    // Illness indicator
    if (isIll && illnessInfo) {
      ctx.fillStyle = this.getIllnessColor(illnessInfo.type);
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(illnessInfo.name, width - 12, 16);
      // Mini progress bar
      const barW = 60;
      ctx.strokeStyle = '#444';
      ctx.strokeRect(width - 12 - barW, 24, barW, 6);
      ctx.fillStyle = this.getIllnessColor(illnessInfo.type);
      ctx.fillRect(width - 12 - barW, 24, barW * illnessInfo.progress, 6);
    }
  }

  private renderStatBars(ctx: CanvasRenderingContext2D, width: number, _height: number): void {
    if (!this.pet) return;

    const stats = this.pet.stats;
    const statEntries: { label: string; value: number; color: string }[] = [
      { label: 'HUN', value: stats.hunger, color: '#f97316' },
      { label: 'HAP', value: stats.happiness, color: '#fbbf24' },
      { label: 'ENR', value: stats.energy, color: '#4ecca3' },
      { label: 'HYG', value: stats.hygiene, color: '#87ceeb' },
      { label: 'HLT', value: stats.health, color: '#ef4444' },
      { label: 'BND', value: stats.bond, color: '#a78bfa' },
    ];

    const barStartY = 52;
    const barWidth = (width - 24) / statEntries.length - 4;
    const barHeight = 8;

    ctx.font = '8px monospace';
    ctx.textAlign = 'center';

    statEntries.forEach((stat, i) => {
      const x = 12 + i * (barWidth + 4);
      const y = barStartY;

      // Label
      ctx.fillStyle = '#888';
      ctx.fillText(stat.label, x + barWidth / 2, y);

      // Background
      ctx.fillStyle = '#222';
      ctx.fillRect(x, y + 4, barWidth, barHeight);

      // Fill
      const fillColor = stat.value < 25 ? '#ef4444' : stat.color;
      ctx.fillStyle = fillColor;
      ctx.fillRect(x, y + 4, barWidth * (stat.value / 100), barHeight);

      // Low stat warning pulse
      if (stat.value < 20) {
        ctx.fillStyle = '#ef4444';
        ctx.globalAlpha = 0.3 + Math.sin(this.elapsed * 4) * 0.3;
        ctx.fillRect(x, y + 4, barWidth, barHeight);
        ctx.globalAlpha = 1;
      }
    });
  }

  private renderTouchButtons(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    this.touchButtons = [];

    const btnW = 80;
    const btnH = 40;
    const btnY = height - 56;
    const padding = 16;

    const buttons = [
      { label: 'Menu', key: 'menu' },
      { label: 'Kitchen', key: 'kitchen' },
    ];

    const totalW = buttons.length * btnW + (buttons.length - 1) * padding;
    const startX = (width - totalW) / 2;

    buttons.forEach((btn, i) => {
      const x = startX + i * (btnW + padding);
      this.touchButtons.push({ ...btn, x, y: btnY, w: btnW, h: btnH });

      // Button background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.strokeStyle = 'rgba(233, 69, 96, 0.5)';
      ctx.lineWidth = 1;

      // Rounded rect
      const r = 8;
      ctx.beginPath();
      ctx.moveTo(x + r, btnY);
      ctx.lineTo(x + btnW - r, btnY);
      ctx.arcTo(x + btnW, btnY, x + btnW, btnY + r, r);
      ctx.lineTo(x + btnW, btnY + btnH - r);
      ctx.arcTo(x + btnW, btnY + btnH, x + btnW - r, btnY + btnH, r);
      ctx.lineTo(x + r, btnY + btnH);
      ctx.arcTo(x, btnY + btnH, x, btnY + btnH - r, r);
      ctx.lineTo(x, btnY + r);
      ctx.arcTo(x, btnY, x + r, btnY, r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.fillStyle = '#e0e0e0';
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, x + btnW / 2, btnY + btnH / 2);
    });

    // Keyboard hint
    ctx.fillStyle = '#555';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('ESC=Menu  K=Kitchen', width / 2, height - 8);
  }

  private derivePetAnimState(pet: PetState): PetAnimState {
    // Priority: sleeping > sick > sad > happy > playing > eating > idle
    if (pet.sleep.phase !== 'awake') return 'sleeping';
    if (this.statsEngine.isIll(pet)) return 'sick';
    if (pet.stats.happiness < 20 || pet.stats.hunger < 15) return 'sad';
    if (pet.mood.dominantMood === 'happy' || pet.stats.happiness > 80) return 'happy';
    if (pet.mood.dominantMood === 'playful') return 'playing';
    return 'idle';
  }

  private deriveMusicMood(): MusicMood {
    const hour = new Date().getHours();
    const isNight = hour >= 21 || hour < 6;

    if (this.pet?.sleep.phase !== 'awake') return 'night_sleep';
    if (this.pet && this.statsEngine.isIll(this.pet)) return 'tense';
    if (this.pet && this.pet.stats.happiness < 25) return 'tense';

    if (isNight) return 'night_calm';
    if (this.pet?.mood.dominantMood === 'playful') return 'day_playful';
    return 'day_calm';
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
