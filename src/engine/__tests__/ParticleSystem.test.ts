import { describe, it, expect, beforeEach } from 'vitest';
import { ParticleSystem } from '../ParticleSystem';

describe('ParticleSystem', () => {
  let particles: ParticleSystem;

  beforeEach(() => {
    particles = new ParticleSystem();
  });

  it('starts with zero particles', () => {
    expect(particles.count).toBe(0);
  });

  it('emits particles at specified position', () => {
    particles.emit('sparkle', 100, 200, 5);
    expect(particles.count).toBe(5);
  });

  it('emits default count of particles', () => {
    particles.emit('evolution', 100, 200);
    expect(particles.count).toBe(10);
  });

  it('particles decay over time', () => {
    particles.emit('sparkle', 100, 200, 5);
    expect(particles.count).toBe(5);

    // Advance time well past particle lifetime
    for (let i = 0; i < 300; i++) {
      particles.update(1 / 60);
    }
    expect(particles.count).toBe(0);
  });

  it('clears all particles', () => {
    particles.emit('hearts', 100, 200, 20);
    expect(particles.count).toBe(20);
    particles.clear();
    expect(particles.count).toBe(0);
  });

  it('emits weather particles', () => {
    particles.emitWeather('rain', 480, 3);
    expect(particles.count).toBe(3);
  });

  it('renders without errors', () => {
    const ctx = {
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      beginPath: () => {},
      closePath: () => {},
      arc: () => {},
      ellipse: () => {},
      fill: () => {},
      stroke: () => {},
      moveTo: () => {},
      lineTo: () => {},
      bezierCurveTo: () => {},
      fillRect: () => {},
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D;

    particles.emit('evolution', 100, 200, 5);
    particles.emit('healing', 100, 200, 3);
    particles.emit('rain', 100, 200, 2);
    particles.emit('snow', 100, 200, 2);
    particles.emit('hearts', 100, 200, 2);
    particles.emit('coins', 100, 200, 2);
    particles.emit('cooking', 100, 200, 2);
    particles.emit('wind_leaves', 100, 200, 2);

    expect(() => particles.render(ctx)).not.toThrow();
  });

  it('handles all particle types', () => {
    const types = [
      'evolution', 'healing', 'cooking', 'rain', 'snow',
      'wind_leaves', 'sparkle', 'hearts', 'coins',
    ] as const;

    for (const type of types) {
      particles.emit(type, 100, 200, 1);
    }
    expect(particles.count).toBe(types.length);
  });
});
