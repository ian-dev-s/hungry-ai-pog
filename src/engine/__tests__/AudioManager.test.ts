import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioManager } from '../AudioManager';

// Mock Web Audio API
function createMockAudioContext() {
  const mockGainNode = {
    gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  };

  const mockOscillator = {
    type: 'sine' as OscillatorType,
    frequency: { value: 440 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null as (() => void) | null,
  };

  const mockCtx = {
    state: 'running',
    currentTime: 0,
    resume: vi.fn(),
    close: vi.fn(),
    destination: {},
    createGain: vi.fn(() => ({ ...mockGainNode })),
    createOscillator: vi.fn(() => ({ ...mockOscillator })),
  };

  return mockCtx;
}

describe('AudioManager', () => {
  let audio: AudioManager;

  beforeEach(() => {
    audio = new AudioManager();
  });

  it('starts uninitialized', () => {
    expect(audio.isInitialized).toBe(false);
  });

  it('initializes with AudioContext', () => {
    const mockCtx = createMockAudioContext();
    vi.stubGlobal('AudioContext', vi.fn(() => mockCtx));

    audio.init();
    expect(audio.isInitialized).toBe(true);

    vi.unstubAllGlobals();
  });

  it('does not double-initialize', () => {
    const mockCtx = createMockAudioContext();
    const AudioContextSpy = vi.fn(() => mockCtx);
    vi.stubGlobal('AudioContext', AudioContextSpy);

    audio.init();
    audio.init();
    expect(AudioContextSpy).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it('handles missing AudioContext gracefully', () => {
    vi.stubGlobal('AudioContext', vi.fn(() => { throw new Error('not supported'); }));
    expect(() => audio.init()).not.toThrow();
    expect(audio.isInitialized).toBe(false);
    vi.unstubAllGlobals();
  });

  it('sets and gets music volume', () => {
    audio.musicVolume = 0.5;
    expect(audio.musicVolume).toBe(0.5);
  });

  it('clamps music volume to 0-1', () => {
    audio.musicVolume = 1.5;
    expect(audio.musicVolume).toBe(1);

    audio.musicVolume = -0.5;
    expect(audio.musicVolume).toBe(0);
  });

  it('sets and gets sfx volume', () => {
    audio.sfxVolume = 0.6;
    expect(audio.sfxVolume).toBe(0.6);
  });

  it('clamps sfx volume to 0-1', () => {
    audio.sfxVolume = 2;
    expect(audio.sfxVolume).toBe(1);
  });

  it('plays sfx without errors when initialized', () => {
    const mockCtx = createMockAudioContext();
    vi.stubGlobal('AudioContext', vi.fn(() => mockCtx));

    audio.init();
    expect(() => audio.playSfx('ui_select')).not.toThrow();
    expect(() => audio.playSfx('coin_jingle')).not.toThrow();
    expect(() => audio.playSfx('evolution_chime')).not.toThrow();

    vi.unstubAllGlobals();
  });

  it('does nothing when playing sfx without init', () => {
    expect(() => audio.playSfx('ui_select')).not.toThrow();
  });

  it('plays pet voice without errors when initialized', () => {
    const mockCtx = createMockAudioContext();
    vi.stubGlobal('AudioContext', vi.fn(() => mockCtx));

    audio.init();
    expect(() => audio.playPetVoice('chirp', 'forest')).not.toThrow();
    expect(() => audio.playPetVoice('growl', 'fire')).not.toThrow();
    expect(() => audio.playPetVoice('purr', 'aquatic')).not.toThrow();

    vi.unstubAllGlobals();
  });

  it('starts and stops music', () => {
    const mockCtx = createMockAudioContext();
    vi.stubGlobal('AudioContext', vi.fn(() => mockCtx));

    audio.init();
    audio.startMusic('day_calm');
    expect(audio.isMusicPlaying).toBe(true);

    audio.stopMusic();
    expect(audio.isMusicPlaying).toBe(false);

    vi.unstubAllGlobals();
  });

  it('updates music without errors', () => {
    const mockCtx = createMockAudioContext();
    vi.stubGlobal('AudioContext', vi.fn(() => mockCtx));

    audio.init();
    audio.startMusic('night_calm');
    expect(() => audio.updateMusic(1 / 60)).not.toThrow();

    vi.unstubAllGlobals();
  });

  it('destroys cleanly', () => {
    const mockCtx = createMockAudioContext();
    vi.stubGlobal('AudioContext', vi.fn(() => mockCtx));

    audio.init();
    audio.startMusic('day_calm');
    expect(() => audio.destroy()).not.toThrow();
    expect(audio.isInitialized).toBe(false);

    vi.unstubAllGlobals();
  });
});
