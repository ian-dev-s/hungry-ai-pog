/**
 * Save schema definitions for game state persistence.
 * Version-tagged to support future migrations.
 */

import type { EggState } from './EggConfig';

export const CURRENT_SAVE_VERSION = 4;

export type TrainingSkill = 'obedience' | 'tricks' | 'agility';

export interface TrainingState {
  /** Accumulated session count today (resets daily). */
  sessionsToday: number;
  /** Timestamp of the last completed training session. */
  lastSessionTimestamp: number;
  /** Cumulative overtraining fatigue (0-100). Decays over time. */
  fatigue: number;
  /** Skill proficiency levels (0-100). */
  skills: Record<TrainingSkill, number>;
}

export type BathPhase = 'idle' | 'scrub' | 'rinse' | 'dry' | 'done';
export type WaterTemperature = 'cold' | 'warm' | 'hot';

export interface HygieneState {
  /** Current dirt level (0-100). Higher = dirtier. */
  dirtLevel: number;
  /** Current phase if a bath is in progress. */
  bathPhase: BathPhase;
  /** Progress within the current bath phase (0-100). */
  bathProgress: number;
  /** Whether pet has been groomed (juvenile+ only). */
  groomed: boolean;
  /** Timestamp of last bath. */
  lastBathTimestamp: number;
}

export type SleepPhase = 'awake' | 'drowsy' | 'light' | 'deep' | 'dream';

export interface SleepState {
  /** Current sleep phase. */
  phase: SleepPhase;
  /** Timestamp when current sleep session started (0 if awake). */
  sleepStartTimestamp: number;
  /** Whether a nightlight is active. */
  nightlightOn: boolean;
  /** Current dream mood icon (null if not dreaming). */
  dreamMood: string | null;
  /** Whether sleep was forced (player put pet to bed vs natural). */
  wasForced: boolean;
}

export interface IllnessState {
  type: string | null;
  startTimestamp: number | null;
}

export interface MoodIntensity {
  mood: string;
  intensity: number;
}

export interface PetMemoryEvent {
  type: string;
  timestamp: number;
  details?: string;
}

export interface MoodState {
  /** Current mood intensities (composite — multiple can be active). */
  moods: MoodIntensity[];
  /** Dominant mood (highest intensity above threshold). */
  dominantMood: string | null;
}

export interface CommunicationState {
  /** Timestamp of last pet-initiated communication. */
  lastBubbleTimestamp: number;
  /** Timestamp of last player talk interaction. */
  lastTalkTimestamp: number;
  /** Recent events the pet remembers (influences behavior and requests). */
  memory: PetMemoryEvent[];
}

export interface PetState {
  name: string;
  elementType: string;
  lifeStage: string;
  stats: {
    hunger: number;
    happiness: number;
    energy: number;
    hygiene: number;
    health: number;
    bond: number;
    discipline: number;
  };
  hiddenStats: {
    personality: [number, number, number, number];
    trust: number;
    stress: number;
  };
  illness: IllnessState;
  evolutionPath: string | null;
  birthTimestamp: number;
  stageStartTimestamp: number;
  careHistory: {
    happinessAvg: number;
    disciplineRatio: number;
    uniqueFoodsCount: number;
    activitiesCompleted: number;
    bondAvg: number;
    secretFlags: Record<string, boolean>;
  };
  training: TrainingState;
  hygieneCare: HygieneState;
  sleep: SleepState;
  mood: MoodState;
  communication: CommunicationState;
}

export interface InventoryItem {
  id: string;
  type: string;
  quantity: number;
}

export interface RoomItem {
  id: string;
  itemId: string;
  x: number;
  y: number;
}

export interface RoomLayout {
  wallpaper: string;
  flooring: string;
  placedItems: RoomItem[];
}

export interface UnlockState {
  recipes: string[];
  biomes: string[];
  miniGames: string[];
  items: string[];
}

export interface FamilyTreeEntry {
  petId: string;
  name: string;
  elementType: string;
  evolutionPath: string | null;
  birthTimestamp: number;
  retiredTimestamp: number | null;
  parentId: string | null;
  legacyTrait: string | null;
}

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  notifications: boolean;
  colorblindMode: string;
  textSize: number;
  difficulty: 'casual' | 'classic';
}

export interface FeedingStateData {
  fullness: number;
  mealHistory: {
    foodId: string;
    timestamp: number;
    reaction: string;
  }[];
  lastFedTimestamp: number;
}

export interface SaveData {
  version: number;
  pet: PetState | null;
  egg: EggState | null;
  inventory: InventoryItem[];
  room: RoomLayout;
  unlocks: UnlockState;
  familyTree: FamilyTreeEntry[];
  coins: number;
  feeding: FeedingStateData;
  settings: GameSettings;
  timestamps: {
    created: number;
    lastSaved: number;
    lastOpened: number;
    totalPlayTime: number;
  };
  achievements: string[];
  dailyStreak: {
    count: number;
    lastCheckIn: number;
  };
}

export function createDefaultTrainingState(): TrainingState {
  return {
    sessionsToday: 0,
    lastSessionTimestamp: 0,
    fatigue: 0,
    skills: { obedience: 0, tricks: 0, agility: 0 },
  };
}

export function createDefaultHygieneState(): HygieneState {
  return {
    dirtLevel: 0,
    bathPhase: 'idle',
    bathProgress: 0,
    groomed: false,
    lastBathTimestamp: 0,
  };
}

export function createDefaultSleepState(): SleepState {
  return {
    phase: 'awake',
    sleepStartTimestamp: 0,
    nightlightOn: false,
    dreamMood: null,
    wasForced: false,
  };
}

export function createDefaultMoodState(): MoodState {
  return {
    moods: [],
    dominantMood: null,
  };
}

export function createDefaultCommunicationState(): CommunicationState {
  return {
    lastBubbleTimestamp: 0,
    lastTalkTimestamp: 0,
    memory: [],
  };
}

export function createDefaultSave(): SaveData {
  const now = Date.now();
  return {
    version: CURRENT_SAVE_VERSION,
    pet: null,
    egg: null,
    inventory: [],
    room: {
      wallpaper: 'default',
      flooring: 'default',
      placedItems: [],
    },
    unlocks: {
      recipes: [],
      biomes: [],
      miniGames: [],
      items: [],
    },
    familyTree: [],
    coins: 0,
    feeding: {
      fullness: 50,
      mealHistory: [],
      lastFedTimestamp: now,
    },
    settings: {
      musicVolume: 0.7,
      sfxVolume: 0.8,
      notifications: true,
      colorblindMode: 'none',
      textSize: 1,
      difficulty: 'classic',
    },
    timestamps: {
      created: now,
      lastSaved: now,
      lastOpened: now,
      totalPlayTime: 0,
    },
    achievements: [],
    dailyStreak: {
      count: 0,
      lastCheckIn: 0,
    },
  };
}
