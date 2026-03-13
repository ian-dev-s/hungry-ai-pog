import {
  type ColorblindMode,
  type ColorPalette,
  COLOR_PALETTES,
} from '../data/AccessibilityConfig';

const STORAGE_KEY = 'hungry-ai-pog-a11y';

interface AccessibilityPrefs {
  colorblindMode: ColorblindMode;
  reduceMotion: boolean;
}

/**
 * Manages accessibility preferences:
 * - Colorblind-friendly color palettes
 * - Screen reader announcements via ARIA live region
 * - Reduced motion preference detection
 */
export class AccessibilitySystem {
  private prefs: AccessibilityPrefs;
  private liveRegion: HTMLElement | null = null;

  constructor() {
    this.prefs = this.loadPrefs();
    this.initLiveRegion();
    this.detectReduceMotion();
  }

  get palette(): ColorPalette {
    return COLOR_PALETTES[this.prefs.colorblindMode];
  }

  get colorblindMode(): ColorblindMode {
    return this.prefs.colorblindMode;
  }

  get reduceMotion(): boolean {
    return this.prefs.reduceMotion;
  }

  setColorblindMode(mode: ColorblindMode): void {
    this.prefs.colorblindMode = mode;
    this.savePrefs();
  }

  setReduceMotion(reduce: boolean): void {
    this.prefs.reduceMotion = reduce;
    this.savePrefs();
  }

  /**
   * Announce a message to screen readers via the ARIA live region.
   * Call this when significant game state changes occur.
   */
  announce(message: string): void {
    if (!this.liveRegion) return;
    // Clear and re-set to trigger re-announcement for repeated messages
    this.liveRegion.textContent = '';
    // Use setTimeout to ensure DOM update fires a new announcement
    setTimeout(() => {
      if (this.liveRegion) this.liveRegion.textContent = message;
    }, 50);
  }

  private initLiveRegion(): void {
    if (typeof document === 'undefined') return;

    let region = document.getElementById('a11y-live-region');
    if (!region) {
      region = document.createElement('div');
      region.id = 'a11y-live-region';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('aria-atomic', 'true');
      // Visually hidden but accessible to screen readers
      region.style.cssText = [
        'position:absolute',
        'width:1px',
        'height:1px',
        'padding:0',
        'margin:-1px',
        'overflow:hidden',
        'clip:rect(0,0,0,0)',
        'white-space:nowrap',
        'border:0',
      ].join(';');
      document.body.appendChild(region);
    }
    this.liveRegion = region;
  }

  private detectReduceMotion(): void {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      this.prefs.reduceMotion = true;
    }
    mq.addEventListener('change', (e) => {
      this.prefs.reduceMotion = e.matches;
      this.savePrefs();
    });
  }

  private loadPrefs(): AccessibilityPrefs {
    const defaults: AccessibilityPrefs = { colorblindMode: 'default', reduceMotion: false };
    if (typeof localStorage === 'undefined') return defaults;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw) as Partial<AccessibilityPrefs>;
      return {
        colorblindMode: parsed.colorblindMode ?? defaults.colorblindMode,
        reduceMotion: parsed.reduceMotion ?? defaults.reduceMotion,
      };
    } catch {
      return defaults;
    }
  }

  private savePrefs(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.prefs));
    } catch {
      // Storage unavailable — continue without persisting
    }
  }
}
