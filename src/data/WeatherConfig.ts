/**
 * Configuration for the weather and seasons system.
 * Seasons are derived from real-world calendar months.
 * Weather is generated from a deterministic time-based cycle.
 */

export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export type WeatherType =
  | 'sunny'
  | 'cloudy'
  | 'rainy'
  | 'snowy'
  | 'stormy';

export interface WeatherModifiers {
  /** Multipliers applied to stat decay rates (1.0 = no change). */
  decayMultipliers: {
    hunger: number;
    happiness: number;
    energy: number;
    hygiene: number;
    health: number;
    bond: number;
    discipline: number;
  };
  /** Multiplier for exercise/activity effectiveness. */
  activityEffectiveness: number;
}

/** Duration of each weather period in seconds (2 hours real-time). */
export const WEATHER_PERIOD_SECONDS = 7200;

/** Get the current season from a real-world timestamp. */
export function getSeasonFromTimestamp(timestampMs: number): Season {
  const month = new Date(timestampMs).getMonth(); // 0-indexed
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

/**
 * Weighted weather distribution per season.
 * Each entry is [weatherType, weight] — higher weight = more likely.
 */
const SEASON_WEATHER_WEIGHTS: Record<Season, [WeatherType, number][]> = {
  spring: [
    ['sunny', 30],
    ['cloudy', 25],
    ['rainy', 35],
    ['snowy', 0],
    ['stormy', 10],
  ],
  summer: [
    ['sunny', 55],
    ['cloudy', 20],
    ['rainy', 10],
    ['snowy', 0],
    ['stormy', 15],
  ],
  fall: [
    ['sunny', 25],
    ['cloudy', 35],
    ['rainy', 30],
    ['snowy', 5],
    ['stormy', 5],
  ],
  winter: [
    ['sunny', 20],
    ['cloudy', 30],
    ['rainy', 15],
    ['snowy', 35],
    ['stormy', 0],
  ],
};

/**
 * Deterministically pick a weather type from a seed value.
 * Uses the weighted distribution for the given season.
 */
export function getWeatherForSeed(seed: number, season: Season): WeatherType {
  const weights = SEASON_WEATHER_WEIGHTS[season];
  const totalWeight = weights.reduce((sum, [, w]) => sum + w, 0);
  // Map seed to [0, totalWeight)
  const roll = ((seed % totalWeight) + totalWeight) % totalWeight;
  let cumulative = 0;
  for (const [weather, weight] of weights) {
    cumulative += weight;
    if (roll < cumulative) return weather;
  }
  // Fallback — should not reach here
  return weights[0][0];
}

/**
 * Stat decay modifiers per weather type.
 * Values > 1.0 increase decay; < 1.0 reduce decay.
 */
export const WEATHER_MODIFIERS: Record<WeatherType, WeatherModifiers> = {
  sunny: {
    decayMultipliers: {
      hunger: 1.1,
      happiness: 0.85,
      energy: 1.0,
      hygiene: 1.0,
      health: 0.9,
      bond: 0.9,
      discipline: 1.0,
    },
    activityEffectiveness: 1.2,
  },
  cloudy: {
    decayMultipliers: {
      hunger: 1.0,
      happiness: 1.05,
      energy: 1.0,
      hygiene: 1.0,
      health: 1.0,
      bond: 1.0,
      discipline: 1.0,
    },
    activityEffectiveness: 1.0,
  },
  rainy: {
    decayMultipliers: {
      hunger: 1.0,
      happiness: 1.15,
      energy: 1.1,
      hygiene: 0.9,
      health: 1.05,
      bond: 1.1,
      discipline: 1.0,
    },
    activityEffectiveness: 0.8,
  },
  snowy: {
    decayMultipliers: {
      hunger: 1.2,
      happiness: 0.95,
      energy: 1.2,
      hygiene: 1.1,
      health: 1.1,
      bond: 0.95,
      discipline: 1.0,
    },
    activityEffectiveness: 0.7,
  },
  stormy: {
    decayMultipliers: {
      hunger: 1.1,
      happiness: 1.3,
      energy: 1.2,
      hygiene: 1.0,
      health: 1.15,
      bond: 1.2,
      discipline: 1.05,
    },
    activityEffectiveness: 0.5,
  },
};

/** Foods available per season (in addition to always-available ones). */
export const SEASONAL_FOODS: Record<Season, string[]> = {
  spring: ['cherry_blossom_cake', 'fresh_salad', 'herb_soup'],
  summer: ['watermelon', 'ice_cream', 'grilled_corn', 'berry_smoothie'],
  fall: ['pumpkin_pie', 'apple_cider', 'mushroom_stew', 'harvest_bread'],
  winter: ['hot_cocoa', 'gingerbread', 'roast_stew', 'snow_pudding'],
};

/** Activities available per weather type (in addition to always-available). */
export const WEATHER_ACTIVITIES: Record<WeatherType, string[]> = {
  sunny: ['outdoor_play', 'sunbathing', 'picnic'],
  cloudy: ['cloud_watching', 'outdoor_walk'],
  rainy: ['indoor_games', 'puddle_jumping', 'nap'],
  snowy: ['snowball_fight', 'sledding', 'cozy_reading'],
  stormy: ['hide_and_seek_indoors', 'cozy_movie', 'quiet_time'],
};
