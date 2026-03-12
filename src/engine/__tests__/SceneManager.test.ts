import { describe, it, expect, vi } from 'vitest';
import { SceneManager, type Scene } from '@engine/SceneManager';

function makeScene(name: string) {
  return {
    name,
    enter: vi.fn() as () => void,
    exit: vi.fn() as () => void,
    update: vi.fn() as (dt: number) => void,
    render: vi.fn() as (renderer: any) => void,
  };
}

describe('SceneManager', () => {
  it('registers and switches to a scene', () => {
    const sm = new SceneManager();
    const scene = makeScene('test');
    sm.register(scene);
    sm.switchTo('test');

    expect(sm.current).toBe(scene);
    expect(scene.enter).toHaveBeenCalledOnce();
  });

  it('throws when switching to unregistered scene', () => {
    const sm = new SceneManager();
    expect(() => sm.switchTo('nope')).toThrow('Scene "nope" not registered');
  });

  it('calls exit on previous scene when switching', () => {
    const sm = new SceneManager();
    const a = makeScene('a');
    const b = makeScene('b');
    sm.register(a);
    sm.register(b);

    sm.switchTo('a');
    sm.switchTo('b');

    expect(a.exit).toHaveBeenCalledOnce();
    expect(b.enter).toHaveBeenCalledOnce();
  });

  it('delegates update and render to current scene', () => {
    const sm = new SceneManager();
    const scene = makeScene('test');
    sm.register(scene);
    sm.switchTo('test');

    sm.update(0.016);
    sm.render({} as any);

    expect(scene.update).toHaveBeenCalledWith(0.016);
    expect(scene.render).toHaveBeenCalledOnce();
  });

  it('does nothing when no scene is active', () => {
    const sm = new SceneManager();
    expect(sm.current).toBeNull();
    // Should not throw
    sm.update(0.016);
    sm.render({} as any);
  });
});
