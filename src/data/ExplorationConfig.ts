/**
 * Configuration for the Exploration System & Biomes.
 *
 * Defines 5 biomes with loot tables, encounter tables, risk levels,
 * and requirements. Exploration unlocks at the adolescent life stage.
 */

import type { ElementType } from './EvolutionArchetypes';
import type { LifeStage } from './StatsConfig';

// ─── Life Stage Gating ──────────────────────────────────────────────────────

/** Life stages that can explore. Unlocked at adolescent. */
export const EXPLORABLE_STAGES: LifeStage[] = [
  'adolescent',
  'adult',
  'elder',
];

// ─── Biome Types ────────────────────────────────────────────────────────────

export type BiomeId = 'meadow' | 'forest' | 'cave' | 'beach' | 'sky_islands';

export type RiskLevel = 'low' | 'medium' | 'high';

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export type EncounterType = 'item_find' | 'wild_creature' | 'challenge';

// ─── Loot Definitions ───────────────────────────────────────────────────────

export interface LootEntry {
  id: string;
  name: string;
  rarity: ItemRarity;
  /** Base drop weight (higher = more likely). */
  weight: number;
  /** Description for the results screen. */
  description: string;
}

// ─── Encounter Definitions ──────────────────────────────────────────────────

export interface EncounterEntry {
  id: string;
  type: EncounterType;
  name: string;
  /** Base probability weight. */
  weight: number;
  /** Stat that primarily determines success for challenges. */
  checkStat?: string;
  /** Threshold (0-100) to pass the check. */
  checkThreshold?: number;
  /** Description shown to player. */
  description: string;
  /** Bonus loot IDs awarded on success. */
  successLoot?: string[];
  /** Bond / happiness delta on success. */
  successReward?: { bond?: number; happiness?: number; energy?: number };
  /** Stat penalty on failure. */
  failurePenalty?: { health?: number; happiness?: number; energy?: number };
}

// ─── Biome Definition ───────────────────────────────────────────────────────

export interface BiomeDefinition {
  id: BiomeId;
  name: string;
  description: string;
  riskLevel: RiskLevel;
  /** Expedition duration in seconds. */
  duration: number;
  /** Energy cost to begin the expedition. */
  energyCost: number;
  /** Minimum stats required to enter. */
  statRequirements?: Partial<Record<string, number>>;
  /** Required personality trait (brave index >= threshold) for entry. */
  personalityRequirement?: { index: number; minValue: number };
  /** Only specific element types can enter (null = all welcome). */
  elementRequirement?: ElementType[] | null;
  /** Element types that get a bonus here. */
  elementBonus?: ElementType[];
  /** Multiplier applied to loot weight for bonus elements. */
  elementBonusMultiplier?: number;
  lootTable: LootEntry[];
  encounterTable: EncounterEntry[];
}

// ─── Risk Level Multipliers ─────────────────────────────────────────────────

/** Challenge difficulty multiplier per risk level. */
export const RISK_DIFFICULTY_MULTIPLIER: Record<RiskLevel, number> = {
  low: 0.8,
  medium: 1.0,
  high: 1.3,
};

/** Rare loot bonus multiplier per risk level. */
export const RISK_RARE_LOOT_MULTIPLIER: Record<RiskLevel, number> = {
  low: 1.0,
  medium: 1.3,
  high: 1.8,
};

// ─── Expedition Timing ──────────────────────────────────────────────────────

/** Minimum energy required to start any expedition. */
export const MIN_ENERGY_TO_EXPLORE = 25;

/** Cooldown between expeditions in seconds. */
export const EXPEDITION_COOLDOWN = 600;

/** Number of encounters per expedition. */
export const ENCOUNTERS_PER_EXPEDITION = 3;

/** Bond boost for befriending a wild creature. */
export const WILD_CREATURE_BOND_BONUS = 8;

/** Happiness boost for finding an item. */
export const ITEM_FIND_HAPPINESS_BONUS = 5;

// ─── Personality Influence ──────────────────────────────────────────────────

/** Brave personality index (from [playful, brave, gentle, smart]). */
export const BRAVE_PERSONALITY_INDEX = 1;

/** Smart personality index. */
export const SMART_PERSONALITY_INDEX = 3;

/** Brave pets get better loot rolls. */
export const BRAVE_LOOT_BONUS = 1.3;

/** Smart pets have better challenge success. */
export const SMART_CHALLENGE_BONUS = 10;

// ─── Biome Definitions ──────────────────────────────────────────────────────

const MEADOW_LOOT: LootEntry[] = [
  { id: 'wildflower', name: 'Wildflower', rarity: 'common', weight: 30, description: 'A colorful meadow wildflower.' },
  { id: 'clover', name: 'Lucky Clover', rarity: 'common', weight: 25, description: 'A fresh green clover.' },
  { id: 'chamomile', name: 'Chamomile', rarity: 'uncommon', weight: 15, description: 'Soothing chamomile herb.' },
  { id: 'honey_comb', name: 'Honeycomb', rarity: 'uncommon', weight: 12, description: 'Sweet golden honeycomb.' },
  { id: 'rainbow_petal', name: 'Rainbow Petal', rarity: 'rare', weight: 5, description: 'A shimmering petal that shifts color.' },
];

const MEADOW_ENCOUNTERS: EncounterEntry[] = [
  { id: 'butterfly_swarm', type: 'wild_creature', name: 'Butterfly Swarm', weight: 30, description: 'A swarm of colorful butterflies flutters nearby.', successReward: { happiness: 8, bond: 3 } },
  { id: 'herb_patch', type: 'item_find', name: 'Herb Patch', weight: 35, description: 'A patch of useful herbs grows here.', successLoot: ['chamomile'] },
  { id: 'gentle_breeze', type: 'challenge', name: 'Gusty Hill', weight: 20, checkStat: 'energy', checkThreshold: 30, description: 'A steep hill with strong gusts. Climb it?', successReward: { happiness: 10 }, failurePenalty: { energy: -10 } },
  { id: 'baby_bunny', type: 'wild_creature', name: 'Baby Bunny', weight: 15, description: 'A timid baby bunny peeks from the grass.', successReward: { bond: 5, happiness: 5 } },
];

const FOREST_LOOT: LootEntry[] = [
  { id: 'acorn', name: 'Golden Acorn', rarity: 'common', weight: 25, description: 'A plump golden acorn.' },
  { id: 'mushroom', name: 'Forest Mushroom', rarity: 'common', weight: 25, description: 'A fragrant forest mushroom.' },
  { id: 'rare_berry', name: 'Moonberry', rarity: 'uncommon', weight: 15, description: 'A berry that glows faintly in the dark.' },
  { id: 'oak_bark', name: 'Ancient Oak Bark', rarity: 'uncommon', weight: 12, description: 'Bark from a centuries-old oak tree.' },
  { id: 'forest_crystal', name: 'Forest Crystal', rarity: 'rare', weight: 6, description: 'A green crystal pulsing with life energy.' },
  { id: 'spirit_wood', name: 'Spirit Wood', rarity: 'legendary', weight: 2, description: 'Ethereal wood from the heart of the forest.' },
];

const FOREST_ENCOUNTERS: EncounterEntry[] = [
  { id: 'wolf_pup', type: 'wild_creature', name: 'Lone Wolf Pup', weight: 20, description: 'A curious wolf pup approaches cautiously.', successReward: { bond: 6, happiness: 4 } },
  { id: 'fallen_log', type: 'challenge', name: 'Fallen Log Bridge', weight: 25, checkStat: 'discipline', checkThreshold: 40, description: 'A fallen log spans a ravine. Cross carefully?', successReward: { happiness: 8 }, successLoot: ['rare_berry'], failurePenalty: { health: -8, happiness: -5 } },
  { id: 'mushroom_ring', type: 'item_find', name: 'Mushroom Ring', weight: 30, description: 'A fairy ring of rare mushrooms.', successLoot: ['mushroom', 'rare_berry'] },
  { id: 'territorial_owl', type: 'challenge', name: 'Territorial Owl', weight: 15, checkStat: 'bond', checkThreshold: 50, description: 'An owl screeches a warning! Stand your ground?', successReward: { bond: 5 }, failurePenalty: { happiness: -8 } },
  { id: 'hidden_cache', type: 'item_find', name: 'Hidden Cache', weight: 10, description: 'Something glints beneath a root.', successLoot: ['forest_crystal'] },
];

const CAVE_LOOT: LootEntry[] = [
  { id: 'raw_gem', name: 'Raw Gem', rarity: 'common', weight: 20, description: 'An uncut gemstone.' },
  { id: 'cave_moss', name: 'Cave Moss', rarity: 'common', weight: 22, description: 'Bioluminescent cave moss.' },
  { id: 'amethyst', name: 'Amethyst Cluster', rarity: 'uncommon', weight: 15, description: 'A cluster of purple amethyst crystals.' },
  { id: 'obsidian_shard', name: 'Obsidian Shard', rarity: 'uncommon', weight: 12, description: 'A razor-sharp shard of volcanic glass.' },
  { id: 'dragon_scale', name: 'Dragon Scale', rarity: 'rare', weight: 5, description: 'A shimmering scale from an ancient dragon.' },
  { id: 'heart_of_mountain', name: 'Heart of the Mountain', rarity: 'legendary', weight: 1, description: 'A legendary gem said to hold the mountain\'s soul.' },
];

const CAVE_ENCOUNTERS: EncounterEntry[] = [
  { id: 'bat_colony', type: 'challenge', name: 'Bat Colony', weight: 25, checkStat: 'discipline', checkThreshold: 50, description: 'A colony of bats startles awake! Stay calm?', successReward: { happiness: 5 }, failurePenalty: { health: -10, happiness: -8 } },
  { id: 'crystal_chamber', type: 'item_find', name: 'Crystal Chamber', weight: 20, description: 'A cavern glittering with crystals.', successLoot: ['amethyst', 'raw_gem'] },
  { id: 'cave_troll', type: 'challenge', name: 'Cave Troll', weight: 15, checkStat: 'health', checkThreshold: 55, description: 'A massive troll blocks the passage!', successReward: { bond: 8, happiness: 10 }, successLoot: ['dragon_scale'], failurePenalty: { health: -15, energy: -10 } },
  { id: 'glowing_pool', type: 'wild_creature', name: 'Glowing Cave Fish', weight: 20, description: 'Luminous fish swim in an underground pool.', successReward: { happiness: 6, bond: 4 } },
  { id: 'treasure_vein', type: 'item_find', name: 'Treasure Vein', weight: 10, description: 'A vein of precious ore runs through the wall.', successLoot: ['heart_of_mountain'] },
  { id: 'rock_slide', type: 'challenge', name: 'Rock Slide', weight: 10, checkStat: 'energy', checkThreshold: 50, description: 'Rocks tumble from above! Dodge quickly!', successReward: { happiness: 5 }, failurePenalty: { health: -12, energy: -8 } },
];

const BEACH_LOOT: LootEntry[] = [
  { id: 'sea_shell', name: 'Sea Shell', rarity: 'common', weight: 28, description: 'A pretty spiral sea shell.' },
  { id: 'sand_dollar', name: 'Sand Dollar', rarity: 'common', weight: 22, description: 'A flat sand dollar.' },
  { id: 'pearl', name: 'Pearl', rarity: 'uncommon', weight: 14, description: 'A lustrous natural pearl.' },
  { id: 'coral_piece', name: 'Coral Piece', rarity: 'uncommon', weight: 12, description: 'A beautiful piece of living coral.' },
  { id: 'mermaid_tear', name: 'Mermaid\'s Tear', rarity: 'rare', weight: 5, description: 'A crystallized tear said to be from a mermaid.' },
  { id: 'trident_fragment', name: 'Trident Fragment', rarity: 'legendary', weight: 1, description: 'A fragment of a mythical sea trident.' },
];

const BEACH_ENCOUNTERS: EncounterEntry[] = [
  { id: 'tide_pool', type: 'item_find', name: 'Tide Pool', weight: 30, description: 'A tide pool full of interesting finds.', successLoot: ['sea_shell', 'coral_piece'] },
  { id: 'friendly_dolphin', type: 'wild_creature', name: 'Friendly Dolphin', weight: 20, description: 'A dolphin leaps from the waves!', successReward: { happiness: 10, bond: 6 } },
  { id: 'sandcastle_challenge', type: 'challenge', name: 'Sandcastle Contest', weight: 20, checkStat: 'happiness', checkThreshold: 35, description: 'Build the best sandcastle on the beach!', successReward: { happiness: 12, bond: 4 }, failurePenalty: { happiness: -3 } },
  { id: 'hermit_crab', type: 'wild_creature', name: 'Hermit Crab', weight: 15, description: 'A tiny hermit crab waves its claw.', successReward: { bond: 4, happiness: 5 } },
  { id: 'riptide', type: 'challenge', name: 'Riptide', weight: 15, checkStat: 'energy', checkThreshold: 40, description: 'A strong current pulls outward. Swim to safety!', successReward: { happiness: 6 }, failurePenalty: { health: -10, energy: -12 } },
];

const SKY_ISLANDS_LOOT: LootEntry[] = [
  { id: 'cloud_fluff', name: 'Cloud Fluff', rarity: 'common', weight: 25, description: 'A soft tuft of solid cloud.' },
  { id: 'sky_feather', name: 'Sky Feather', rarity: 'common', weight: 22, description: 'A feather that floats upward.' },
  { id: 'starlight_dust', name: 'Starlight Dust', rarity: 'uncommon', weight: 14, description: 'Sparkling dust from the cosmos.' },
  { id: 'wind_crystal', name: 'Wind Crystal', rarity: 'uncommon', weight: 12, description: 'A crystal that hums with wind energy.' },
  { id: 'celestial_orb', name: 'Celestial Orb', rarity: 'rare', weight: 5, description: 'An orb containing a miniature galaxy.' },
  { id: 'cosmic_egg', name: 'Cosmic Egg', rarity: 'legendary', weight: 1, description: 'A mysterious egg from beyond the stars.' },
];

const SKY_ISLANDS_ENCOUNTERS: EncounterEntry[] = [
  { id: 'wind_spirit', type: 'wild_creature', name: 'Wind Spirit', weight: 25, description: 'A playful wind spirit dances around you.', successReward: { happiness: 8, bond: 5 } },
  { id: 'cloud_bridge', type: 'challenge', name: 'Cloud Bridge', weight: 20, checkStat: 'discipline', checkThreshold: 45, description: 'A bridge of clouds stretches between islands. Trust it?', successReward: { happiness: 10 }, successLoot: ['starlight_dust'], failurePenalty: { health: -10, energy: -8 } },
  { id: 'star_garden', type: 'item_find', name: 'Star Garden', weight: 20, description: 'A garden of crystallized starlight.', successLoot: ['starlight_dust', 'celestial_orb'] },
  { id: 'sky_whale', type: 'wild_creature', name: 'Sky Whale', weight: 15, description: 'A majestic sky whale glides past.', successReward: { bond: 8, happiness: 10 } },
  { id: 'storm_updraft', type: 'challenge', name: 'Storm Updraft', weight: 10, checkStat: 'energy', checkThreshold: 50, description: 'A violent updraft threatens to blow you away!', successReward: { happiness: 8 }, failurePenalty: { health: -8, energy: -12 } },
  { id: 'cosmic_shrine', type: 'item_find', name: 'Cosmic Shrine', weight: 10, description: 'An ancient shrine floats among the clouds.', successLoot: ['cosmic_egg'] },
];

// ─── Biome Registry ─────────────────────────────────────────────────────────

export const BIOME_DEFINITIONS: Record<BiomeId, BiomeDefinition> = {
  meadow: {
    id: 'meadow',
    name: 'Sunny Meadow',
    description: 'A peaceful meadow filled with wildflowers and gentle breezes. Low risk, perfect for beginners.',
    riskLevel: 'low',
    duration: 120,
    energyCost: 15,
    elementBonus: ['forest'],
    elementBonusMultiplier: 1.3,
    lootTable: MEADOW_LOOT,
    encounterTable: MEADOW_ENCOUNTERS,
  },
  forest: {
    id: 'forest',
    name: 'Whispering Forest',
    description: 'A dense forest full of hidden treasures and lurking dangers. Medium risk with rare rewards.',
    riskLevel: 'medium',
    duration: 180,
    energyCost: 25,
    elementBonus: ['forest'],
    elementBonusMultiplier: 1.4,
    lootTable: FOREST_LOOT,
    encounterTable: FOREST_ENCOUNTERS,
  },
  cave: {
    id: 'cave',
    name: 'Crystal Caverns',
    description: 'Deep underground caves glittering with gems. High risk but incredible rewards. Requires bravery.',
    riskLevel: 'high',
    duration: 240,
    energyCost: 35,
    personalityRequirement: { index: BRAVE_PERSONALITY_INDEX, minValue: 0.4 },
    elementBonus: ['fire'],
    elementBonusMultiplier: 1.5,
    lootTable: CAVE_LOOT,
    encounterTable: CAVE_ENCOUNTERS,
  },
  beach: {
    id: 'beach',
    name: 'Coral Beach',
    description: 'A tropical beach with shells, tide pools, and ocean friends. Aquatic pets thrive here.',
    riskLevel: 'low',
    duration: 150,
    energyCost: 20,
    elementBonus: ['aquatic'],
    elementBonusMultiplier: 1.5,
    lootTable: BEACH_LOOT,
    encounterTable: BEACH_ENCOUNTERS,
  },
  sky_islands: {
    id: 'sky_islands',
    name: 'Sky Islands',
    description: 'Floating islands among the clouds. Only cosmic-aligned pets can reach these heights.',
    riskLevel: 'high',
    duration: 300,
    energyCost: 40,
    elementRequirement: ['cosmic'],
    elementBonus: ['cosmic'],
    elementBonusMultiplier: 1.6,
    lootTable: SKY_ISLANDS_LOOT,
    encounterTable: SKY_ISLANDS_ENCOUNTERS,
  },
};

export const ALL_BIOME_IDS: BiomeId[] = ['meadow', 'forest', 'cave', 'beach', 'sky_islands'];

/** Get a biome definition by ID. */
export function getBiomeById(id: BiomeId): BiomeDefinition {
  return BIOME_DEFINITIONS[id];
}
