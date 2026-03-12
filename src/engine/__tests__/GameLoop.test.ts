import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameLoop } from '@engine/GameLoop';

describe('GameLoop', () => {
  let rafCallbacks: ((time: number) => void)[];
  let rafId: number;

  beforeEach(() => {
    rafCallbacks = [];
    rafId = 0;
    vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) => {
      rafCallbacks.push(cb);
      return ++rafId;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('performance', { now: vi.fn(() => 0) });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls update and render on each frame', () => {
    const update = vi.fn();
    const render = vi.fn();
    const loop = new GameLoop(update, render);

    (performance.now as ReturnType<typeof vi.fn>).mockReturnValue(0);
    loop.start();

    // First rAF fires
    (performance.now as ReturnType<typeof vi.fn>).mockReturnValue(16);
    rafCallbacks[0](16);

    expect(update).toHaveBeenCalledOnce();
    expect(render).toHaveBeenCalledOnce();
    // dt should be ~0.016
    expect(update.mock.calls[0][0]).toBeCloseTo(0.016, 2);
  });

  it('caps dt to maxDt (50ms)', () => {
    const update = vi.fn();
    const loop = new GameLoop(update, vi.fn());

    (performance.now as ReturnType<typeof vi.fn>).mockReturnValue(0);
    loop.start();

    // Simulate 200ms gap
    (performance.now as ReturnType<typeof vi.fn>).mockReturnValue(200);
    rafCallbacks[0](200);

    expect(update.mock.calls[0][0]).toBe(0.05); // 1/20
  });

  it('stops the loop', () => {
    const update = vi.fn();
    const loop = new GameLoop(update, vi.fn());

    (performance.now as ReturnType<typeof vi.fn>).mockReturnValue(0);
    loop.start();
    loop.stop();

    expect(cancelAnimationFrame).toHaveBeenCalled();
  });
});
