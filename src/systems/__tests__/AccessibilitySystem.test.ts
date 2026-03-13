import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AccessibilitySystem } from '../AccessibilitySystem';
import { COLOR_PALETTES } from '../../data/AccessibilityConfig';

// Simple in-memory localStorage mock
function makeLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
  };
}

// DOM element mock for the live region
function makeLiveRegion() {
  const attrs: Record<string, string> = {};
  return {
    id: 'a11y-live-region',
    textContent: '',
    style: { cssText: '' },
    setAttribute: (k: string, v: string) => { attrs[k] = v; },
    getAttribute: (k: string) => attrs[k] ?? null,
  };
}

function makeMockDocument(existingRegion: ReturnType<typeof makeLiveRegion> | null = null) {
  const region = existingRegion ?? makeLiveRegion();
  const appended: unknown[] = [];
  return {
    getElementById: (id: string) => (id === 'a11y-live-region' ? existingRegion : null),
    createElement: (_tag: string) => ({ ...makeLiveRegion(), style: { cssText: '' } }),
    body: { appendChild: (el: unknown) => { appended.push(el); } },
    _appended: appended,
    _region: region,
  };
}

describe('AccessibilitySystem', () => {
  let lsMock: ReturnType<typeof makeLocalStorageMock>;

  beforeEach(() => {
    lsMock = makeLocalStorageMock();
    vi.stubGlobal('localStorage', lsMock);
    vi.stubGlobal('window', {
      matchMedia: () => ({
        matches: false,
        addEventListener: vi.fn(),
      }),
    });
    vi.stubGlobal('document', makeMockDocument());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('defaults to the standard palette', () => {
    const system = new AccessibilitySystem();
    expect(system.colorblindMode).toBe('default');
    expect(system.palette).toEqual(COLOR_PALETTES.default);
  });

  it('switches to protanopia palette', () => {
    const system = new AccessibilitySystem();
    system.setColorblindMode('protanopia');
    expect(system.colorblindMode).toBe('protanopia');
    expect(system.palette).toEqual(COLOR_PALETTES.protanopia);
  });

  it('switches to deuteranopia palette', () => {
    const system = new AccessibilitySystem();
    system.setColorblindMode('deuteranopia');
    expect(system.palette).toEqual(COLOR_PALETTES.deuteranopia);
  });

  it('switches to tritanopia palette', () => {
    const system = new AccessibilitySystem();
    system.setColorblindMode('tritanopia');
    expect(system.palette).toEqual(COLOR_PALETTES.tritanopia);
  });

  it('persists colorblind mode to localStorage', () => {
    const system = new AccessibilitySystem();
    system.setColorblindMode('deuteranopia');

    // Simulate new page load with same localStorage
    const system2 = new AccessibilitySystem();
    expect(system2.colorblindMode).toBe('deuteranopia');
  });

  it('handles corrupt localStorage data gracefully', () => {
    lsMock.setItem('hungry-ai-pog-a11y', 'not-valid-json{{{');
    const system = new AccessibilitySystem();
    expect(system.colorblindMode).toBe('default');
  });

  it('can set and persist reduceMotion preference', () => {
    const system = new AccessibilitySystem();
    system.setReduceMotion(true);

    const system2 = new AccessibilitySystem();
    expect(system2.reduceMotion).toBe(true);
  });

  it('detects prefers-reduced-motion from OS', () => {
    vi.stubGlobal('window', {
      matchMedia: () => ({
        matches: true,
        addEventListener: vi.fn(),
      }),
    });
    const system = new AccessibilitySystem();
    expect(system.reduceMotion).toBe(true);
  });

  it('announces messages via the live region', () => {
    vi.useFakeTimers();
    const region = makeLiveRegion();
    vi.stubGlobal('document', {
      getElementById: (id: string) => (id === 'a11y-live-region' ? region : null),
      createElement: vi.fn(),
      body: { appendChild: vi.fn() },
    });

    const system = new AccessibilitySystem();
    system.announce('Your pet is hungry!');

    vi.advanceTimersByTime(100);
    expect(region.textContent).toBe('Your pet is hungry!');
  });

  it('all palettes have a unique primary color vs default', () => {
    expect(COLOR_PALETTES.default.primary).not.toBe(COLOR_PALETTES.protanopia.primary);
    expect(COLOR_PALETTES.default.primary).not.toBe(COLOR_PALETTES.deuteranopia.primary);
  });

  it('each palette defines all required color keys', () => {
    const requiredKeys: (keyof typeof COLOR_PALETTES.default)[] = [
      'primary', 'accent', 'warning', 'danger', 'success', 'info', 'muted',
      'statHunger', 'statHappiness', 'statEnergy', 'statHygiene', 'statHealth', 'statBond',
    ];
    for (const [mode, palette] of Object.entries(COLOR_PALETTES)) {
      for (const key of requiredKeys) {
        expect(palette[key], `${mode}.${key} should be defined`).toBeTruthy();
      }
    }
  });
});
