/**
 * Evolution archetypes and elemental categories.
 * 20+ adult forms across forest, aquatic, fire, and cosmic categories.
 * Evolution is determined by weighted care history during growth.
 */

export type ElementType = 'forest' | 'aquatic' | 'fire' | 'cosmic';

export interface EvolutionArchetype {
  id: string;
  name: string;
  element: ElementType;
  /** Weighted thresholds for evolution. Higher = more of that care type needed. */
  weights: EvolutionWeights;
  /** If true, requires special secret conditions to unlock. */
  secret: boolean;
  /** Description for the collection journal. */
  description: string;
}

export interface EvolutionWeights {
  happiness: number;
  discipline: number;
  dietVariety: number;
  activityLevel: number;
  socialBond: number;
}

export interface CareHistory {
  /** Average happiness maintained (0-100). */
  happinessAvg: number;
  /** Ratio of discipline interactions to total interactions (0-1). */
  disciplineRatio: number;
  /** Number of unique food types fed. */
  uniqueFoodsCount: number;
  /** Total mini-games and activities completed. */
  activitiesCompleted: number;
  /** Average bond stat maintained (0-100). */
  bondAvg: number;
  /** Tracking for secret conditions. */
  secretFlags: Record<string, boolean>;
}

export function createDefaultCareHistory(): CareHistory {
  return {
    happinessAvg: 50,
    disciplineRatio: 0.5,
    uniqueFoodsCount: 0,
    activitiesCompleted: 0,
    bondAvg: 50,
    secretFlags: {},
  };
}

// -- Forest archetypes --

const FOREST_ARCHETYPES: EvolutionArchetype[] = [
  {
    id: 'forest_guardian',
    name: 'Forest Guardian',
    element: 'forest',
    weights: { happiness: 0.3, discipline: 0.3, dietVariety: 0.2, activityLevel: 0.1, socialBond: 0.1 },
    secret: false,
    description: 'A stalwart protector of the woodland, grown strong through balanced care.',
  },
  {
    id: 'bloom_sprite',
    name: 'Bloom Sprite',
    element: 'forest',
    weights: { happiness: 0.4, discipline: 0.05, dietVariety: 0.3, activityLevel: 0.1, socialBond: 0.15 },
    secret: false,
    description: 'A cheerful flower spirit nurtured on happiness and varied diet.',
  },
  {
    id: 'thorn_beast',
    name: 'Thorn Beast',
    element: 'forest',
    weights: { happiness: 0.05, discipline: 0.45, dietVariety: 0.1, activityLevel: 0.3, socialBond: 0.1 },
    secret: false,
    description: 'A fierce thorny creature forged through discipline and activity.',
  },
  {
    id: 'moss_elder',
    name: 'Moss Elder',
    element: 'forest',
    weights: { happiness: 0.2, discipline: 0.15, dietVariety: 0.15, activityLevel: 0.05, socialBond: 0.45 },
    secret: false,
    description: 'A wise ancient being that thrived on deep bonds and gentle care.',
  },
  {
    id: 'mushroom_mystic',
    name: 'Mushroom Mystic',
    element: 'forest',
    weights: { happiness: 0.15, discipline: 0.1, dietVariety: 0.45, activityLevel: 0.15, socialBond: 0.15 },
    secret: false,
    description: 'A mysterious fungi creature grown on an eclectic diet.',
  },
  {
    id: 'ancient_treant',
    name: 'Ancient Treant',
    element: 'forest',
    weights: { happiness: 0.2, discipline: 0.2, dietVariety: 0.2, activityLevel: 0.2, socialBond: 0.2 },
    secret: true,
    description: 'A legendary tree being. Only appears when all aspects of care are perfectly balanced.',
  },
];

// -- Aquatic archetypes --

const AQUATIC_ARCHETYPES: EvolutionArchetype[] = [
  {
    id: 'tide_serpent',
    name: 'Tide Serpent',
    element: 'aquatic',
    weights: { happiness: 0.15, discipline: 0.35, dietVariety: 0.15, activityLevel: 0.25, socialBond: 0.1 },
    secret: false,
    description: 'A powerful sea serpent disciplined through rigorous training.',
  },
  {
    id: 'coral_dancer',
    name: 'Coral Dancer',
    element: 'aquatic',
    weights: { happiness: 0.4, discipline: 0.05, dietVariety: 0.15, activityLevel: 0.3, socialBond: 0.1 },
    secret: false,
    description: 'A graceful reef dweller that loves to play and stay active.',
  },
  {
    id: 'pearl_sage',
    name: 'Pearl Sage',
    element: 'aquatic',
    weights: { happiness: 0.2, discipline: 0.2, dietVariety: 0.3, activityLevel: 0.05, socialBond: 0.25 },
    secret: false,
    description: 'A calm wisdom-keeper nurtured with varied foods and companionship.',
  },
  {
    id: 'storm_leviathan',
    name: 'Storm Leviathan',
    element: 'aquatic',
    weights: { happiness: 0.1, discipline: 0.3, dietVariety: 0.1, activityLevel: 0.4, socialBond: 0.1 },
    secret: false,
    description: 'A tempestuous giant raised on intense activity and discipline.',
  },
  {
    id: 'bubble_jelly',
    name: 'Bubble Jelly',
    element: 'aquatic',
    weights: { happiness: 0.35, discipline: 0.05, dietVariety: 0.2, activityLevel: 0.1, socialBond: 0.3 },
    secret: false,
    description: 'A bubbly jellyfish creature that thrives on happiness and friendship.',
  },
  {
    id: 'abyssal_oracle',
    name: 'Abyssal Oracle',
    element: 'aquatic',
    weights: { happiness: 0.2, discipline: 0.2, dietVariety: 0.2, activityLevel: 0.2, socialBond: 0.2 },
    secret: true,
    description: 'A deep-sea prophet. Only manifests under perfectly balanced care.',
  },
];

// -- Fire archetypes --

const FIRE_ARCHETYPES: EvolutionArchetype[] = [
  {
    id: 'ember_drake',
    name: 'Ember Drake',
    element: 'fire',
    weights: { happiness: 0.2, discipline: 0.3, dietVariety: 0.1, activityLevel: 0.3, socialBond: 0.1 },
    secret: false,
    description: 'A fierce dragon hatchling trained through discipline and exercise.',
  },
  {
    id: 'flame_fox',
    name: 'Flame Fox',
    element: 'fire',
    weights: { happiness: 0.35, discipline: 0.1, dietVariety: 0.15, activityLevel: 0.25, socialBond: 0.15 },
    secret: false,
    description: 'A playful fire fox kept happy and active.',
  },
  {
    id: 'magma_golem',
    name: 'Magma Golem',
    element: 'fire',
    weights: { happiness: 0.05, discipline: 0.45, dietVariety: 0.2, activityLevel: 0.2, socialBond: 0.1 },
    secret: false,
    description: 'A stoic molten being shaped by strict discipline.',
  },
  {
    id: 'solar_phoenix',
    name: 'Solar Phoenix',
    element: 'fire',
    weights: { happiness: 0.25, discipline: 0.15, dietVariety: 0.15, activityLevel: 0.15, socialBond: 0.3 },
    secret: false,
    description: 'A radiant bird reborn through strong bonds and balanced joy.',
  },
  {
    id: 'cinder_imp',
    name: 'Cinder Imp',
    element: 'fire',
    weights: { happiness: 0.3, discipline: 0.05, dietVariety: 0.35, activityLevel: 0.2, socialBond: 0.1 },
    secret: false,
    description: 'A mischievous imp that loves snacks and fun.',
  },
  {
    id: 'inferno_titan',
    name: 'Inferno Titan',
    element: 'fire',
    weights: { happiness: 0.2, discipline: 0.2, dietVariety: 0.2, activityLevel: 0.2, socialBond: 0.2 },
    secret: true,
    description: 'A legendary fire colossus. Only forged through perfectly balanced care.',
  },
];

// -- Cosmic archetypes --

const COSMIC_ARCHETYPES: EvolutionArchetype[] = [
  {
    id: 'star_wisp',
    name: 'Star Wisp',
    element: 'cosmic',
    weights: { happiness: 0.4, discipline: 0.1, dietVariety: 0.15, activityLevel: 0.15, socialBond: 0.2 },
    secret: false,
    description: 'A shimmering celestial mote kept joyful and social.',
  },
  {
    id: 'void_walker',
    name: 'Void Walker',
    element: 'cosmic',
    weights: { happiness: 0.1, discipline: 0.35, dietVariety: 0.1, activityLevel: 0.35, socialBond: 0.1 },
    secret: false,
    description: 'A dark traveler shaped by discipline and relentless activity.',
  },
  {
    id: 'nebula_moth',
    name: 'Nebula Moth',
    element: 'cosmic',
    weights: { happiness: 0.25, discipline: 0.05, dietVariety: 0.35, activityLevel: 0.1, socialBond: 0.25 },
    secret: false,
    description: 'A colorful cosmic moth attracted to variety and affection.',
  },
  {
    id: 'comet_hound',
    name: 'Comet Hound',
    element: 'cosmic',
    weights: { happiness: 0.2, discipline: 0.2, dietVariety: 0.1, activityLevel: 0.4, socialBond: 0.1 },
    secret: false,
    description: 'A swift celestial beast driven by activity and balanced training.',
  },
  {
    id: 'lunar_cat',
    name: 'Lunar Cat',
    element: 'cosmic',
    weights: { happiness: 0.2, discipline: 0.15, dietVariety: 0.2, activityLevel: 0.1, socialBond: 0.35 },
    secret: false,
    description: 'A mysterious moon cat that bonds deeply with its caretaker.',
  },
  {
    id: 'galaxy_dragon',
    name: 'Galaxy Dragon',
    element: 'cosmic',
    weights: { happiness: 0.2, discipline: 0.2, dietVariety: 0.2, activityLevel: 0.2, socialBond: 0.2 },
    secret: true,
    description: 'The ultimate cosmic being. Only emerges from perfectly balanced care.',
  },
];

export const ALL_ARCHETYPES: EvolutionArchetype[] = [
  ...FOREST_ARCHETYPES,
  ...AQUATIC_ARCHETYPES,
  ...FIRE_ARCHETYPES,
  ...COSMIC_ARCHETYPES,
];

/** Get archetypes for a specific element. */
export function getArchetypesForElement(element: ElementType): EvolutionArchetype[] {
  return ALL_ARCHETYPES.filter((a) => a.element === element);
}

/** Get a specific archetype by ID. */
export function getArchetypeById(id: string): EvolutionArchetype | undefined {
  return ALL_ARCHETYPES.find((a) => a.id === id);
}
