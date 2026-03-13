/**
 * Configuration for synthesized audio using Web Audio API.
 * Defines frequencies, durations, and patterns for all game sounds.
 */

export type SoundEffectId =
  | 'feed_crunch'
  | 'coin_jingle'
  | 'evolution_chime'
  | 'heal_sparkle'
  | 'ui_select'
  | 'ui_confirm'
  | 'ui_back'
  | 'hatch_crack'
  | 'level_up';

export type PetVoiceType = 'chirp' | 'purr' | 'growl' | 'coo' | 'trill' | 'hum';

export type MusicMood = 'day_calm' | 'day_playful' | 'night_calm' | 'night_sleep' | 'tense';

export interface NoteDefinition {
  frequency: number;
  duration: number;
  delay: number;
  type: OscillatorType;
  gain: number;
}

export interface SoundEffect {
  notes: NoteDefinition[];
}

export interface PetVoiceConfig {
  baseFrequency: number;
  type: OscillatorType;
  modRate: number;
  modDepth: number;
  duration: number;
}

export const SOUND_EFFECTS: Record<SoundEffectId, SoundEffect> = {
  feed_crunch: {
    notes: [
      { frequency: 200, duration: 0.05, delay: 0, type: 'square', gain: 0.3 },
      { frequency: 150, duration: 0.05, delay: 0.06, type: 'square', gain: 0.25 },
      { frequency: 180, duration: 0.04, delay: 0.12, type: 'square', gain: 0.2 },
    ],
  },
  coin_jingle: {
    notes: [
      { frequency: 880, duration: 0.1, delay: 0, type: 'sine', gain: 0.25 },
      { frequency: 1100, duration: 0.1, delay: 0.08, type: 'sine', gain: 0.25 },
      { frequency: 1320, duration: 0.15, delay: 0.16, type: 'sine', gain: 0.2 },
    ],
  },
  evolution_chime: {
    notes: [
      { frequency: 523, duration: 0.2, delay: 0, type: 'sine', gain: 0.3 },
      { frequency: 659, duration: 0.2, delay: 0.15, type: 'sine', gain: 0.3 },
      { frequency: 784, duration: 0.2, delay: 0.3, type: 'sine', gain: 0.3 },
      { frequency: 1047, duration: 0.4, delay: 0.45, type: 'sine', gain: 0.35 },
    ],
  },
  heal_sparkle: {
    notes: [
      { frequency: 660, duration: 0.12, delay: 0, type: 'sine', gain: 0.2 },
      { frequency: 880, duration: 0.12, delay: 0.1, type: 'sine', gain: 0.2 },
      { frequency: 1100, duration: 0.15, delay: 0.2, type: 'sine', gain: 0.15 },
    ],
  },
  ui_select: {
    notes: [
      { frequency: 440, duration: 0.06, delay: 0, type: 'square', gain: 0.15 },
    ],
  },
  ui_confirm: {
    notes: [
      { frequency: 520, duration: 0.08, delay: 0, type: 'square', gain: 0.15 },
      { frequency: 700, duration: 0.1, delay: 0.06, type: 'square', gain: 0.15 },
    ],
  },
  ui_back: {
    notes: [
      { frequency: 350, duration: 0.08, delay: 0, type: 'square', gain: 0.15 },
      { frequency: 250, duration: 0.1, delay: 0.06, type: 'square', gain: 0.12 },
    ],
  },
  hatch_crack: {
    notes: [
      { frequency: 120, duration: 0.08, delay: 0, type: 'sawtooth', gain: 0.3 },
      { frequency: 90, duration: 0.06, delay: 0.05, type: 'sawtooth', gain: 0.2 },
    ],
  },
  level_up: {
    notes: [
      { frequency: 440, duration: 0.15, delay: 0, type: 'sine', gain: 0.25 },
      { frequency: 554, duration: 0.15, delay: 0.12, type: 'sine', gain: 0.25 },
      { frequency: 659, duration: 0.15, delay: 0.24, type: 'sine', gain: 0.25 },
      { frequency: 880, duration: 0.3, delay: 0.36, type: 'sine', gain: 0.3 },
    ],
  },
};

export const ELEMENT_VOICES: Record<string, PetVoiceConfig> = {
  forest: { baseFrequency: 440, type: 'sine', modRate: 6, modDepth: 30, duration: 0.25 },
  aquatic: { baseFrequency: 520, type: 'sine', modRate: 8, modDepth: 50, duration: 0.3 },
  fire: { baseFrequency: 280, type: 'sawtooth', modRate: 4, modDepth: 20, duration: 0.2 },
  cosmic: { baseFrequency: 600, type: 'triangle', modRate: 10, modDepth: 80, duration: 0.35 },
  shadow: { baseFrequency: 180, type: 'triangle', modRate: 3, modDepth: 15, duration: 0.3 },
  crystal: { baseFrequency: 800, type: 'sine', modRate: 12, modDepth: 100, duration: 0.2 },
};

export const PET_VOICE_PATTERNS: Record<PetVoiceType, { freqMultipliers: number[]; gaps: number[] }> = {
  chirp: { freqMultipliers: [1, 1.5, 1.2], gaps: [0.08, 0.06] },
  purr: { freqMultipliers: [1, 0.98, 1.02, 0.99], gaps: [0.05, 0.05, 0.05] },
  growl: { freqMultipliers: [0.5, 0.48, 0.52], gaps: [0.1, 0.08] },
  coo: { freqMultipliers: [1, 0.8], gaps: [0.15] },
  trill: { freqMultipliers: [1, 1.3, 1, 1.3, 1], gaps: [0.04, 0.04, 0.04, 0.04] },
  hum: { freqMultipliers: [1, 1.02, 0.98, 1], gaps: [0.1, 0.1, 0.1] },
};

/** Music chord progressions (as frequency arrays). */
export const MUSIC_CHORDS: Record<MusicMood, number[][]> = {
  day_calm: [
    [261.6, 329.6, 392.0],  // C major
    [293.7, 370.0, 440.0],  // D major
    [246.9, 311.1, 370.0],  // B minor
    [261.6, 329.6, 392.0],  // C major
  ],
  day_playful: [
    [329.6, 415.3, 493.9],  // E major
    [349.2, 440.0, 523.3],  // F major
    [392.0, 493.9, 587.3],  // G major
    [440.0, 554.4, 659.3],  // A major
  ],
  night_calm: [
    [220.0, 261.6, 329.6],  // A minor
    [196.0, 246.9, 293.7],  // G minor (low)
    [220.0, 277.2, 329.6],  // A (dim feel)
    [233.1, 293.7, 349.2],  // Bb major
  ],
  night_sleep: [
    [196.0, 246.9, 293.7],  // Low G
    [174.6, 220.0, 261.6],  // Low F
    [196.0, 246.9, 293.7],  // Low G
    [164.8, 207.7, 246.9],  // Low E
  ],
  tense: [
    [220.0, 261.6, 311.1],  // A minor
    [207.7, 261.6, 311.1],  // Ab aug
    [196.0, 246.9, 293.7],  // G minor
    [185.0, 233.1, 277.2],  // Gb dim feel
  ],
};

export const MUSIC_TEMPO: Record<MusicMood, number> = {
  day_calm: 2.0,
  day_playful: 1.2,
  night_calm: 2.5,
  night_sleep: 3.5,
  tense: 1.8,
};
