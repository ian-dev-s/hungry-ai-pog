/**
 * Mood Engine — calculates composite mood from recent events and pet stats.
 *
 * Multiple moods can be active simultaneously with different intensities.
 * The dominant mood is the one with the highest intensity above its threshold.
 * Moods decay over time and are reinforced by events and stat conditions.
 */

import type { PetState, MoodState, PetMemoryEvent } from '../data/SaveSchema';
import {
  type MoodType,
  type PetEventType,
  ALL_MOODS,
  MOOD_DEFINITIONS,
  EVENT_MOOD_EFFECTS,
  STAT_MOOD_RULES,
  MAX_MEMORY_EVENTS,
  EVENT_MEMORY_DECAY_MS,
} from '../data/PersonalityConfig';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class MoodEngine {
  /**
   * Tick mood state forward by dt seconds.
   * Applies stat-based mood influences and decays existing moods.
   */
  tick(pet: PetState, dt: number): void {
    const mood = pet.mood;

    // Decay existing moods
    for (const entry of mood.moods) {
      const def = MOOD_DEFINITIONS[entry.mood as MoodType];
      if (def) {
        entry.intensity = clamp(entry.intensity - def.decayRate * dt, 0, def.maxIntensity);
      }
    }

    // Apply stat-based mood influences
    for (const rule of STAT_MOOD_RULES) {
      const statValue = this.getStatValue(pet, rule.stat);
      if (statValue === null) continue;

      let applies = false;
      if (rule.below !== undefined && statValue < rule.below) applies = true;
      if (rule.above !== undefined && statValue > rule.above) applies = true;

      if (applies) {
        this.addMoodIntensity(mood, rule.mood, rule.intensity * dt);
      }
    }

    // Prune moods that have decayed to zero
    mood.moods = mood.moods.filter((m) => m.intensity > 0.5);

    // Recalculate dominant mood
    mood.dominantMood = this.calculateDominantMood(mood);
  }

  /**
   * Record an event and apply its mood effects immediately.
   */
  recordEvent(pet: PetState, eventType: PetEventType, details?: string): void {
    // Add to memory
    pet.communication.memory.push({
      type: eventType,
      timestamp: Date.now(),
      details,
    });

    // Trim memory
    if (pet.communication.memory.length > MAX_MEMORY_EVENTS) {
      pet.communication.memory = pet.communication.memory.slice(-MAX_MEMORY_EVENTS);
    }

    // Apply mood effects
    const effects = EVENT_MOOD_EFFECTS[eventType];
    if (effects) {
      for (const [mood, delta] of Object.entries(effects)) {
        if (delta !== undefined) {
          if (delta > 0) {
            this.addMoodIntensity(pet.mood, mood as MoodType, delta);
          } else {
            this.reduceMoodIntensity(pet.mood, mood as MoodType, Math.abs(delta));
          }
        }
      }
    }

    // Recalculate dominant mood after event
    pet.mood.dominantMood = this.calculateDominantMood(pet.mood);
  }

  /**
   * Get the dominant mood (highest intensity above threshold).
   */
  getDominantMood(pet: PetState): MoodType | null {
    return pet.mood.dominantMood as MoodType | null;
  }

  /**
   * Get all active moods with their intensities.
   */
  getActiveMoods(pet: PetState): { mood: MoodType; intensity: number }[] {
    return pet.mood.moods
      .filter((m) => {
        const def = MOOD_DEFINITIONS[m.mood as MoodType];
        return def && m.intensity >= def.threshold;
      })
      .map((m) => ({ mood: m.mood as MoodType, intensity: m.intensity }))
      .sort((a, b) => b.intensity - a.intensity);
  }

  /**
   * Get mood intensity for a specific mood type.
   */
  getMoodIntensity(pet: PetState, mood: MoodType): number {
    const entry = pet.mood.moods.find((m) => m.mood === mood);
    return entry ? entry.intensity : 0;
  }

  /**
   * Get recent events from memory, optionally filtered by recency.
   */
  getRecentEvents(pet: PetState, withinMs?: number): PetMemoryEvent[] {
    const now = Date.now();
    const cutoff = withinMs ?? EVENT_MEMORY_DECAY_MS;
    return pet.communication.memory.filter(
      (e) => now - e.timestamp < cutoff,
    );
  }

  /**
   * Count occurrences of a specific event type in recent memory.
   */
  countRecentEvents(pet: PetState, eventType: PetEventType, withinMs?: number): number {
    return this.getRecentEvents(pet, withinMs).filter(
      (e) => e.type === eventType,
    ).length;
  }

  /**
   * Check if a specific event happened recently.
   */
  hasRecentEvent(pet: PetState, eventType: PetEventType, withinMs?: number): boolean {
    return this.countRecentEvents(pet, eventType, withinMs) > 0;
  }

  private addMoodIntensity(mood: MoodState, moodType: MoodType, amount: number): void {
    const def = MOOD_DEFINITIONS[moodType];
    if (!def) return;

    let entry = mood.moods.find((m) => m.mood === moodType);
    if (!entry) {
      entry = { mood: moodType, intensity: 0 };
      mood.moods.push(entry);
    }
    entry.intensity = clamp(entry.intensity + amount, 0, def.maxIntensity);
  }

  private reduceMoodIntensity(mood: MoodState, moodType: MoodType, amount: number): void {
    const entry = mood.moods.find((m) => m.mood === moodType);
    if (entry) {
      entry.intensity = Math.max(0, entry.intensity - amount);
    }
  }

  private calculateDominantMood(mood: MoodState): string | null {
    let dominant: string | null = null;
    let highestIntensity = 0;

    for (const entry of mood.moods) {
      const def = MOOD_DEFINITIONS[entry.mood as MoodType];
      if (!def) continue;
      if (entry.intensity >= def.threshold && entry.intensity > highestIntensity) {
        highestIntensity = entry.intensity;
        dominant = entry.mood;
      }
    }

    return dominant;
  }

  private getStatValue(pet: PetState, stat: string): number | null {
    if (stat in pet.stats) {
      return pet.stats[stat as keyof typeof pet.stats];
    }
    if (stat in pet.hiddenStats) {
      return pet.hiddenStats[stat as keyof typeof pet.hiddenStats] as number;
    }
    return null;
  }
}
