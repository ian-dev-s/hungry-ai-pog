/**
 * Configuration for the Personality AI & Communication system.
 *
 * Defines mood types, personality quirks, speech bubble templates,
 * rebellion/affection thresholds, and event-to-mood mappings.
 */

// ─── Mood Types ──────────────────────────────────────────────────────────────

export type MoodType =
  | 'happy'
  | 'bored'
  | 'anxious'
  | 'playful'
  | 'grumpy'
  | 'affectionate'
  | 'rebellious';

export interface MoodDefinition {
  /** Base weight — higher means the mood is harder to trigger. */
  threshold: number;
  /** How quickly this mood decays per second when not reinforced. */
  decayRate: number;
  /** Maximum intensity (0-100). */
  maxIntensity: number;
}

export const MOOD_DEFINITIONS: Record<MoodType, MoodDefinition> = {
  happy: { threshold: 20, decayRate: 0.03, maxIntensity: 100 },
  bored: { threshold: 15, decayRate: 0.04, maxIntensity: 80 },
  anxious: { threshold: 25, decayRate: 0.02, maxIntensity: 90 },
  playful: { threshold: 15, decayRate: 0.05, maxIntensity: 100 },
  grumpy: { threshold: 30, decayRate: 0.02, maxIntensity: 85 },
  affectionate: { threshold: 35, decayRate: 0.015, maxIntensity: 100 },
  rebellious: { threshold: 40, decayRate: 0.01, maxIntensity: 90 },
};

export const ALL_MOODS: MoodType[] = [
  'happy',
  'bored',
  'anxious',
  'playful',
  'grumpy',
  'affectionate',
  'rebellious',
];

// ─── Event Types ─────────────────────────────────────────────────────────────

export type PetEventType =
  | 'fed_loved'
  | 'fed_disliked'
  | 'played_game'
  | 'trained'
  | 'bathed'
  | 'slept_well'
  | 'force_woke'
  | 'got_sick'
  | 'healed'
  | 'pet_stroked'
  | 'talked_to'
  | 'ignored_long'
  | 'storm_weather'
  | 'overfed'
  | 'evolved';

/**
 * How each event type influences mood intensities.
 * Positive values boost a mood; negative values reduce it.
 */
export const EVENT_MOOD_EFFECTS: Record<PetEventType, Partial<Record<MoodType, number>>> = {
  fed_loved: { happy: 25, grumpy: -10, affectionate: 10 },
  fed_disliked: { grumpy: 20, happy: -10 },
  played_game: { playful: 30, bored: -25, happy: 15 },
  trained: { bored: -10, grumpy: 5 },
  bathed: { happy: 10, grumpy: -5 },
  slept_well: { happy: 15, anxious: -15, grumpy: -10 },
  force_woke: { grumpy: 30, anxious: 15, happy: -10 },
  got_sick: { anxious: 25, happy: -15, playful: -20 },
  healed: { happy: 20, anxious: -20 },
  pet_stroked: { affectionate: 20, happy: 10, anxious: -10 },
  talked_to: { affectionate: 15, bored: -15, happy: 10 },
  ignored_long: { bored: 30, grumpy: 20, affectionate: -15 },
  storm_weather: { anxious: 20 },
  overfed: { grumpy: 15, happy: -5 },
  evolved: { happy: 30, playful: 20 },
};

// ─── Stat-Based Mood Contributions ──────────────────────────────────────────

export interface StatMoodRule {
  stat: string;
  below?: number;
  above?: number;
  mood: MoodType;
  intensity: number;
}

/**
 * Background mood influences from current stat levels.
 * Applied each tick to nudge moods based on pet condition.
 */
export const STAT_MOOD_RULES: StatMoodRule[] = [
  { stat: 'happiness', above: 70, mood: 'happy', intensity: 0.02 },
  { stat: 'happiness', below: 30, mood: 'grumpy', intensity: 0.03 },
  { stat: 'energy', below: 25, mood: 'grumpy', intensity: 0.02 },
  { stat: 'energy', above: 70, mood: 'playful', intensity: 0.015 },
  { stat: 'hunger', below: 25, mood: 'grumpy', intensity: 0.025 },
  { stat: 'health', below: 30, mood: 'anxious', intensity: 0.03 },
  { stat: 'bond', above: 75, mood: 'affectionate', intensity: 0.02 },
  { stat: 'bond', below: 25, mood: 'bored', intensity: 0.02 },
];

// ─── Personality Quirks ─────────────────────────────────────────────────────

export type QuirkType =
  | 'mischievous'
  | 'timid'
  | 'brave'
  | 'scholar'
  | 'glutton'
  | 'social';

export interface QuirkDefinition {
  /** Which personality dimension matters (index into [playful, brave, gentle, smart]). */
  personalityIndex: number;
  /** Quirk activates when personality[index] is above this threshold. */
  highThreshold?: number;
  /** Quirk activates when personality[index] is below this threshold. */
  lowThreshold?: number;
  /** Human-readable description. */
  description: string;
}

export const QUIRK_DEFINITIONS: Record<QuirkType, QuirkDefinition> = {
  mischievous: {
    personalityIndex: 0, // playful
    highThreshold: 0.7,
    description: 'Hides items, plays pranks, occasionally refuses commands',
  },
  timid: {
    personalityIndex: 1, // brave
    lowThreshold: 0.3,
    description: 'Hides during storms, startles easily, needs comfort',
  },
  brave: {
    personalityIndex: 1, // brave
    highThreshold: 0.7,
    description: 'Gets better exploration loot, faces challenges head-on',
  },
  scholar: {
    personalityIndex: 3, // smart
    highThreshold: 0.7,
    description: 'Learns training faster, curious about new items',
  },
  glutton: {
    personalityIndex: 2, // gentle
    lowThreshold: 0.3,
    description: 'Asks for food more often, higher fullness decay',
  },
  social: {
    personalityIndex: 2, // gentle
    highThreshold: 0.7,
    description: 'Initiates communication more often, bond decays slower',
  },
};

// ─── Rebellion & Affection ──────────────────────────────────────────────────

/** Rebellion only triggers during the adolescent life stage. */
export const REBELLION_STAGE = 'adolescent';

/** Base probability (0-1) of rebellious action per interaction during adolescence. */
export const REBELLION_BASE_CHANCE = 0.2;

/** High discipline reduces rebellion. Rebellion chance *= (1 - discipline/100 * this). */
export const DISCIPLINE_REBELLION_FACTOR = 0.6;

/** Bond level above which affection expressions can trigger. */
export const AFFECTION_BOND_THRESHOLD = 70;

/** Minimum trust for affection (pet must actually trust the player). */
export const AFFECTION_TRUST_THRESHOLD = 60;

/** Probability of affection expression when thresholds are met. */
export const AFFECTION_EXPRESSION_CHANCE = 0.3;

// ─── Communication / Speech Bubbles ─────────────────────────────────────────

export type BubbleCategory =
  | 'need'
  | 'feeling'
  | 'request'
  | 'affection'
  | 'rebellion';

export interface SpeechBubble {
  icon: string;
  text: string;
  category: BubbleCategory;
  priority: number;
}

/** Need-based bubbles triggered by low stats. */
export const NEED_BUBBLES: Record<string, SpeechBubble> = {
  hungry: { icon: '🍖', text: 'Hungry...', category: 'need', priority: 90 },
  tired: { icon: '💤', text: 'Sleepy...', category: 'need', priority: 85 },
  dirty: { icon: '🛁', text: 'Need bath...', category: 'need', priority: 70 },
  sick: { icon: '🤒', text: 'Not feeling well...', category: 'need', priority: 95 },
  lonely: { icon: '💔', text: 'Play with me?', category: 'need', priority: 75 },
  stressed: { icon: '😰', text: 'Anxious...', category: 'need', priority: 80 },
};

/** Feeling-based bubbles from mood states. */
export const FEELING_BUBBLES: Record<MoodType, SpeechBubble> = {
  happy: { icon: '😊', text: 'Happy!', category: 'feeling', priority: 30 },
  bored: { icon: '😑', text: 'Bored...', category: 'feeling', priority: 50 },
  anxious: { icon: '😟', text: 'Scared...', category: 'feeling', priority: 60 },
  playful: { icon: '⭐', text: 'Let\'s play!', category: 'feeling', priority: 45 },
  grumpy: { icon: '😤', text: 'Hmph!', category: 'feeling', priority: 55 },
  affectionate: { icon: '❤️', text: 'Love you!', category: 'feeling', priority: 35 },
  rebellious: { icon: '😈', text: 'No way!', category: 'feeling', priority: 65 },
};

/** Request bubbles — pet asks for specific things based on memory. */
export const REQUEST_BUBBLES = {
  favorite_food: { icon: '🍽️', text: 'Want {food}!', category: 'request' as BubbleCategory, priority: 60 },
  favorite_game: { icon: '🎮', text: 'Play {game}?', category: 'request' as BubbleCategory, priority: 55 },
  go_outside: { icon: '🌿', text: 'Explore!', category: 'request' as BubbleCategory, priority: 50 },
};

/** Affection expressions for high-bond pets. */
export const AFFECTION_BUBBLES: SpeechBubble[] = [
  { icon: '💕', text: 'Nuzzle~', category: 'affection', priority: 25 },
  { icon: '🥰', text: 'Best friend!', category: 'affection', priority: 25 },
  { icon: '💖', text: 'Purr~', category: 'affection', priority: 20 },
  { icon: '🤗', text: 'Hug!', category: 'affection', priority: 20 },
];

/** Rebellion expressions during adolescence. */
export const REBELLION_BUBBLES: SpeechBubble[] = [
  { icon: '😤', text: 'Don\'t wanna!', category: 'rebellion', priority: 70 },
  { icon: '😒', text: 'Whatever...', category: 'rebellion', priority: 65 },
  { icon: '🙄', text: 'You\'re not the boss!', category: 'rebellion', priority: 75 },
  { icon: '😈', text: 'Make me!', category: 'rebellion', priority: 70 },
];

// ─── Communication Timing ───────────────────────────────────────────────────

/** Minimum seconds between pet-initiated communications. */
export const MIN_COMMUNICATION_INTERVAL = 120;

/** Bond boost when player talks to pet. */
export const TALK_BOND_BOOST = 5;

/** Happiness boost when player talks to pet. */
export const TALK_HAPPINESS_BOOST = 3;

/** Stress reduction when player talks to pet. */
export const TALK_STRESS_REDUCTION = 5;

/** Cooldown (seconds) between talk interactions. */
export const TALK_COOLDOWN = 60;

/** Maximum number of events stored in pet memory. */
export const MAX_MEMORY_EVENTS = 20;

/** How long (ms) before an event is considered "old" and loses influence on mood. */
export const EVENT_MEMORY_DECAY_MS = 2 * 60 * 60 * 1000; // 2 hours

/** How long (ms) events are kept in memory for behavioral references (7 days). */
export const MEMORY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// ─── Vocabulary Growth ──────────────────────────────────────────────────────

/**
 * Vocabulary pools by life stage. Each stage accumulates all previous stage words
 * plus its own new words. Vocabulary is used to pick speech bubble text variants.
 */
export type LifeStageVocab = 'egg' | 'blob' | 'juvenile' | 'adolescent' | 'adult' | 'elder';

export interface VocabEntry {
  /** The speech text. */
  text: string;
  /** Which bubble categories this text can be used for. */
  categories: BubbleCategory[];
}

/**
 * Words/phrases unlocked at each life stage. Cumulative — later stages include
 * all earlier words plus new ones.
 */
export const VOCABULARY_BY_STAGE: Record<LifeStageVocab, VocabEntry[]> = {
  egg: [],
  blob: [
    { text: '...!', categories: ['need', 'feeling'] },
    { text: '*bounce*', categories: ['feeling'] },
    { text: '*wiggle*', categories: ['need'] },
  ],
  juvenile: [
    { text: 'Hungry!', categories: ['need'] },
    { text: 'Play!', categories: ['feeling', 'request'] },
    { text: 'Tired...', categories: ['need'] },
    { text: 'Yay!', categories: ['feeling'] },
    { text: 'No!', categories: ['rebellion'] },
    { text: 'Hug?', categories: ['affection'] },
  ],
  adolescent: [
    { text: 'Whatever...', categories: ['rebellion'] },
    { text: 'Leave me alone!', categories: ['rebellion'] },
    { text: 'Can we go explore?', categories: ['request'] },
    { text: 'I\'m starving!', categories: ['need'] },
    { text: 'This is boring...', categories: ['feeling'] },
    { text: 'You\'re okay, I guess.', categories: ['affection'] },
    { text: 'I feel weird...', categories: ['feeling'] },
  ],
  adult: [
    { text: 'I appreciate you.', categories: ['affection'] },
    { text: 'Could we try something new?', categories: ['request'] },
    { text: 'I\'m not feeling great today.', categories: ['need', 'feeling'] },
    { text: 'Remember when we...', categories: ['affection', 'feeling'] },
    { text: 'I\'d love some {food}!', categories: ['request'] },
    { text: 'Let\'s play {game} again!', categories: ['request'] },
    { text: 'I trust you.', categories: ['affection'] },
  ],
  elder: [
    { text: 'These old bones are tired.', categories: ['need'] },
    { text: 'I\'ve had a wonderful life.', categories: ['affection', 'feeling'] },
    { text: 'You\'ve always been there for me.', categories: ['affection'] },
    { text: 'Let me rest a while.', categories: ['need'] },
    { text: 'I remember everything.', categories: ['feeling'] },
    { text: 'Take care of yourself too.', categories: ['affection'] },
  ],
};

/**
 * The ordered list of stages for vocabulary accumulation.
 * A pet at stage N has all vocabulary from stages 0..N.
 */
export const VOCAB_STAGE_ORDER: LifeStageVocab[] = [
  'egg', 'blob', 'juvenile', 'adolescent', 'adult', 'elder',
];
