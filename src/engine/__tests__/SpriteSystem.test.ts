import { describe, it, expect, beforeEach } from 'vitest';
import { SpriteSystem } from '../SpriteSystem';

describe('SpriteSystem', () => {
  let sprite: SpriteSystem;

  beforeEach(() => {
    sprite = new SpriteSystem();
  });

  it('starts in idle state', () => {
    expect(sprite.getState()).toBe('idle');
  });

  it('transitions between animation states', () => {
    sprite.setState('happy');
    expect(sprite.getState()).toBe('happy');

    sprite.setState('sleeping');
    expect(sprite.getState()).toBe('sleeping');
  });

  it('resets frame index on state change', () => {
    // Advance several frames in idle
    for (let i = 0; i < 100; i++) {
      sprite.update(1 / 60);
    }

    // Switch state - should not throw
    sprite.setState('eating');
    expect(sprite.getState()).toBe('eating');
  });

  it('does not reset when setting same state', () => {
    sprite.setState('idle');
    for (let i = 0; i < 10; i++) {
      sprite.update(1 / 60);
    }
    // Setting same state should be a no-op
    sprite.setState('idle');
    expect(sprite.getState()).toBe('idle');
  });

  it('updates without errors for all states', () => {
    const states = ['idle', 'eating', 'playing', 'sleeping', 'sick', 'happy', 'sad'] as const;
    for (const state of states) {
      sprite.setState(state);
      expect(() => sprite.update(1 / 60)).not.toThrow();
    }
  });

  it('renders without errors for different life stages and elements', () => {
    const canvas = {
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      beginPath: () => {},
      closePath: () => {},
      arc: () => {},
      ellipse: () => {},
      fill: () => {},
      stroke: () => {},
      moveTo: () => {},
      lineTo: () => {},
      quadraticCurveTo: () => {},
      fillRect: () => {},
      fillText: () => {},
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
      lineCap: 'butt' as CanvasLineCap,
      font: '',
    } as unknown as CanvasRenderingContext2D;

    const stages = ['blob', 'juvenile', 'adolescent', 'adult', 'elder'];
    const elements = ['forest', 'aquatic', 'fire', 'cosmic'];

    for (const stage of stages) {
      for (const element of elements) {
        sprite.update(1 / 60);
        expect(() => sprite.render(canvas, 240, 320, stage, element)).not.toThrow();
      }
    }
  });

  it('handles unknown element type gracefully', () => {
    const canvas = {
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      beginPath: () => {},
      closePath: () => {},
      arc: () => {},
      ellipse: () => {},
      fill: () => {},
      stroke: () => {},
      moveTo: () => {},
      lineTo: () => {},
      quadraticCurveTo: () => {},
      fillRect: () => {},
      fillText: () => {},
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
      lineCap: 'butt' as CanvasLineCap,
      font: '',
    } as unknown as CanvasRenderingContext2D;

    sprite.update(1 / 60);
    expect(() => sprite.render(canvas, 240, 320, 'blob', 'unknown_element')).not.toThrow();
  });
});
