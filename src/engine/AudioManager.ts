/**
 * Audio manager using Web Audio API.
 * Handles synthesized sound effects, pet voices, and ambient background music.
 * All sounds are generated procedurally - no audio file assets needed.
 */

import {
  type SoundEffectId,
  type PetVoiceType,
  type MusicMood,
  SOUND_EFFECTS,
  ELEMENT_VOICES,
  PET_VOICE_PATTERNS,
  MUSIC_CHORDS,
  MUSIC_TEMPO,
} from '@data/AudioConfig';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicPlaying = false;
  private currentMusicMood: MusicMood | null = null;
  private musicTimer = 0;
  private musicChordIndex = 0;
  private activeOscillators: OscillatorNode[] = [];
  private _musicVolume = 0.7;
  private _sfxVolume = 0.8;
  private initialized = false;

  /** Must be called from a user gesture to unlock Web Audio. */
  init(): void {
    if (this.initialized) return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this._musicVolume;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this._sfxVolume;
      this.sfxGain.connect(this.masterGain);

      this.initialized = true;
    } catch {
      // Web Audio not available
    }
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  set musicVolume(v: number) {
    this._musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicGain) {
      this.musicGain.gain.value = this._musicVolume;
    }
  }

  get musicVolume(): number {
    return this._musicVolume;
  }

  set sfxVolume(v: number) {
    this._sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxGain) {
      this.sfxGain.gain.value = this._sfxVolume;
    }
  }

  get sfxVolume(): number {
    return this._sfxVolume;
  }

  playSfx(id: SoundEffectId): void {
    if (!this.ctx || !this.sfxGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const effect = SOUND_EFFECTS[id];
    const now = this.ctx.currentTime;

    for (const note of effect.notes) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = note.type;
      osc.frequency.value = note.frequency;

      gain.gain.setValueAtTime(0, now + note.delay);
      gain.gain.linearRampToValueAtTime(note.gain, now + note.delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.delay + note.duration);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + note.delay);
      osc.stop(now + note.delay + note.duration + 0.01);
    }
  }

  playPetVoice(voiceType: PetVoiceType, elementType: string): void {
    if (!this.ctx || !this.sfxGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const voiceConfig = ELEMENT_VOICES[elementType] ?? ELEMENT_VOICES['forest'];
    const pattern = PET_VOICE_PATTERNS[voiceType];
    const now = this.ctx.currentTime;

    let time = 0;
    for (let i = 0; i < pattern.freqMultipliers.length; i++) {
      const freq = voiceConfig.baseFrequency * pattern.freqMultipliers[i];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const mod = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();

      osc.type = voiceConfig.type;
      osc.frequency.value = freq;

      // Vibrato modulation
      mod.frequency.value = voiceConfig.modRate;
      modGain.gain.value = voiceConfig.modDepth;
      mod.connect(modGain);
      modGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.2, now + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + voiceConfig.duration);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + time);
      osc.stop(now + time + voiceConfig.duration + 0.01);
      mod.start(now + time);
      mod.stop(now + time + voiceConfig.duration + 0.01);

      if (i < pattern.gaps.length) {
        time += pattern.gaps[i] + voiceConfig.duration * 0.5;
      }
    }
  }

  setMusicMood(mood: MusicMood): void {
    if (mood === this.currentMusicMood) return;
    this.currentMusicMood = mood;
    this.musicChordIndex = 0;
    this.musicTimer = 0;
  }

  /** Call each frame to drive ambient music playback. */
  updateMusic(dt: number): void {
    if (!this.ctx || !this.musicGain || !this.currentMusicMood) return;
    if (this._musicVolume <= 0) return;

    this.musicTimer -= dt;
    if (this.musicTimer <= 0) {
      this.playMusicChord();
      const tempo = MUSIC_TEMPO[this.currentMusicMood];
      this.musicTimer = tempo;
    }
  }

  startMusic(mood: MusicMood): void {
    this.setMusicMood(mood);
    this.musicPlaying = true;
  }

  stopMusic(): void {
    this.musicPlaying = false;
    this.currentMusicMood = null;
    for (const osc of this.activeOscillators) {
      try { osc.stop(); } catch { /* already stopped */ }
    }
    this.activeOscillators = [];
  }

  get isMusicPlaying(): boolean {
    return this.musicPlaying;
  }

  private playMusicChord(): void {
    if (!this.ctx || !this.musicGain || !this.currentMusicMood) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const chords = MUSIC_CHORDS[this.currentMusicMood];
    const chord = chords[this.musicChordIndex % chords.length];
    const now = this.ctx.currentTime;
    const tempo = MUSIC_TEMPO[this.currentMusicMood];

    for (const freq of chord) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.1);
      gain.gain.setValueAtTime(0.06, now + tempo * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, now + tempo * 0.95);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(now);
      osc.stop(now + tempo);

      this.activeOscillators.push(osc);
      osc.onended = () => {
        const idx = this.activeOscillators.indexOf(osc);
        if (idx >= 0) this.activeOscillators.splice(idx, 1);
      };
    }

    this.musicChordIndex++;
  }

  destroy(): void {
    this.stopMusic();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.initialized = false;
  }
}
