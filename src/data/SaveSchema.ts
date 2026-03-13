/**
 * Save schema definitions for game state persistence.
 * Version-tagged to support future migrations.
 */

export const CURRENT_SAVE_VERSION = 2;

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

export interface SaveData {
  version: number;
  pet: PetState | null;
  inventory: InventoryItem[];
  room: RoomLayout;
  unlocks: UnlockState;
  familyTree: FamilyTreeEntry[];
  coins: number;
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

export function createDefaultSave(): SaveData {
  const now = Date.now();
  return {
    version: CURRENT_SAVE_VERSION,
    pet: null,
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
