/**
 * Weather, Seasons & Time-Away System.
 *
 * Derives the current season from the real-world calendar.
 * Generates deterministic weather from a time-based period seed.
 * Exposes stat decay multipliers and available seasonal content.
 */

import {
  Season,
  WeatherType,
  WeatherModifiers,
  WEATHER_PERIOD_SECONDS,
  getSeasonFromTimestamp,
  getWeatherForSeed,
  WEATHER_MODIFIERS,
  SEASONAL_FOODS,
  WEATHER_ACTIVITIES,
} from '../data/WeatherConfig';
import { StatName } from '../data/StatsConfig';
import { PetState } from '../data/SaveSchema';

export interface WeatherState {
  season: Season;
  weather: WeatherType;
  /** Unix timestamp (ms) when the current weather period started. */
  periodStartMs: number;
  /** Duration of the current weather period in ms. */
  periodDurationMs: number;
}

export interface TimeAwayResult {
  /** The elapsed time that was simulated (ms). */
  elapsedMs: number;
  /** Number of distinct weather periods that occurred. */
  weatherPeriodCount: number;
  /** Weather states encountered during the absence (in order). */
  weatherHistory: WeatherType[];
}

export class WeatherSystem {
  /**
   * Get the current weather state for a given timestamp.
   * Weather cycles are deterministic: same timestamp always yields same weather.
   */
  getWeatherState(timestampMs: number): WeatherState {
    const season = getSeasonFromTimestamp(timestampMs);
    const periodSeconds = WEATHER_PERIOD_SECONDS;
    const periodMs = periodSeconds * 1000;

    // Which period are we in?
    const periodIndex = Math.floor(timestampMs / periodMs);
    const periodStartMs = periodIndex * periodMs;

    // Use period index as the seed for weather selection
    const weather = getWeatherForSeed(periodIndex, season);

    return {
      season,
      weather,
      periodStartMs,
      periodDurationMs: periodMs,
    };
  }

  /** Get the current season from a timestamp. */
  getSeason(timestampMs: number): Season {
    return getSeasonFromTimestamp(timestampMs);
  }

  /** Get the current weather type from a timestamp. */
  getWeather(timestampMs: number): WeatherType {
    return this.getWeatherState(timestampMs).weather;
  }

  /** Get stat decay multipliers for the current weather and season. */
  getModifiers(timestampMs: number): WeatherModifiers {
    const { weather } = this.getWeatherState(timestampMs);
    return WEATHER_MODIFIERS[weather];
  }

  /**
   * Apply weather-based decay multipliers to a stat decay rate.
   * Combines with the base rate computed by StatsEngine.
   */
  applyWeatherDecay(
    stat: StatName,
    baseRate: number,
    timestampMs: number,
  ): number {
    const modifiers = this.getModifiers(timestampMs);
    return baseRate * modifiers.decayMultipliers[stat];
  }

  /** Get foods available in the current season plus always-available ones. */
  getAvailableFoods(timestampMs: number): string[] {
    const season = getSeason(timestampMs);
    return [...ALWAYS_AVAILABLE_FOODS, ...SEASONAL_FOODS[season]];
  }

  /** Get activities available given current weather. */
  getAvailableActivities(timestampMs: number): string[] {
    const { weather } = this.getWeatherState(timestampMs);
    return [...ALWAYS_AVAILABLE_ACTIVITIES, ...WEATHER_ACTIVITIES[weather]];
  }

  /**
   * Simulate pet stats during a time-away period, accounting for weather
   * changes across multiple weather periods.
   *
   * Modifies pet in place and returns a summary of the simulation.
   */
  simulateTimeAway(
    pet: PetState,
    fromMs: number,
    toMs: number,
    tickFn: (pet: PetState, dt: number, weather: WeatherType) => void,
  ): TimeAwayResult {
    const periodMs = WEATHER_PERIOD_SECONDS * 1000;
    const weatherHistory: WeatherType[] = [];
    let cursor = fromMs;
    let periodCount = 0;

    while (cursor < toMs) {
      const state = this.getWeatherState(cursor);
      const periodEnd = state.periodStartMs + state.periodDurationMs;
      const segmentEnd = Math.min(periodEnd, toMs);
      const segmentSec = (segmentEnd - cursor) / 1000;

      // Step through this segment in fixed increments
      const stepSec = segmentSec > 3600 ? 60 : 10;
      const steps = Math.floor(segmentSec / stepSec);
      const remainder = segmentSec - steps * stepSec;

      const weather = state.weather;
      if (
        weatherHistory.length === 0 ||
        weatherHistory[weatherHistory.length - 1] !== weather
      ) {
        weatherHistory.push(weather);
      }

      for (let i = 0; i < steps; i++) {
        tickFn(pet, stepSec, weather);
      }
      if (remainder > 0) {
        tickFn(pet, remainder, weather);
      }

      cursor = segmentEnd;
      periodCount++;

      // Avoid potential infinite loop if period boundaries are misaligned
      if (segmentEnd >= toMs) break;
      // Advance past the period boundary by 1ms to enter the next period
      cursor = Math.min(cursor + 1, toMs);
      void periodMs; // suppress unused warning
    }

    return {
      elapsedMs: toMs - fromMs,
      weatherPeriodCount: periodCount,
      weatherHistory,
    };
  }

  /**
   * Get a human-readable description of the current weather.
   */
  describeWeather(timestampMs: number): string {
    const { season, weather } = this.getWeatherState(timestampMs);
    return `${capitalize(season)} — ${capitalize(weather)}`;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSeason(timestampMs: number): Season {
  return getSeasonFromTimestamp(timestampMs);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const ALWAYS_AVAILABLE_FOODS = ['basic_kibble', 'water', 'plain_bread'];
const ALWAYS_AVAILABLE_ACTIVITIES = ['rest', 'cuddle', 'training'];
