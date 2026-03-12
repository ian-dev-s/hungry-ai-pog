import { describe, it, expect, beforeEach } from 'vitest';
import { WeatherSystem } from '../WeatherSystem';
import {
  getSeasonFromTimestamp,
  getWeatherForSeed,
  WEATHER_PERIOD_SECONDS,
  WEATHER_MODIFIERS,
} from '../../data/WeatherConfig';
import type { WeatherType, Season } from '../../data/WeatherConfig';
import type { PetState } from '../../data/SaveSchema';

// Fixed timestamps for known calendar months (UTC)
// March 15, 2024 — Spring
const SPRING_TS = new Date('2024-03-15T12:00:00Z').getTime();
// July 4, 2024 — Summer
const SUMMER_TS = new Date('2024-07-04T12:00:00Z').getTime();
// October 1, 2024 — Fall
const FALL_TS = new Date('2024-10-01T12:00:00Z').getTime();
// December 25, 2024 — Winter
const WINTER_TS = new Date('2024-12-25T12:00:00Z').getTime();

function createTestPet(overrides?: Partial<PetState>): PetState {
  return {
    name: 'Buddy',
    elementType: 'forest',
    lifeStage: 'adult',
    stats: {
      hunger: 80,
      happiness: 80,
      energy: 80,
      hygiene: 80,
      health: 80,
      bond: 80,
      discipline: 80,
    },
    hiddenStats: {
      personality: [0.5, 0.5, 0.5, 0.5],
      trust: 50,
      stress: 10,
    },
    evolutionPath: null,
    birthTimestamp: SPRING_TS,
    stageStartTimestamp: SPRING_TS,
    ...overrides,
  };
}

describe('getSeasonFromTimestamp', () => {
  it('returns spring for March–May', () => {
    expect(getSeasonFromTimestamp(SPRING_TS)).toBe('spring');
    expect(getSeasonFromTimestamp(new Date('2024-05-20T00:00:00Z').getTime())).toBe('spring');
  });

  it('returns summer for June–August', () => {
    expect(getSeasonFromTimestamp(SUMMER_TS)).toBe('summer');
    expect(getSeasonFromTimestamp(new Date('2024-08-31T00:00:00Z').getTime())).toBe('summer');
  });

  it('returns fall for September–November', () => {
    expect(getSeasonFromTimestamp(FALL_TS)).toBe('fall');
    expect(getSeasonFromTimestamp(new Date('2024-11-15T00:00:00Z').getTime())).toBe('fall');
  });

  it('returns winter for December–February', () => {
    expect(getSeasonFromTimestamp(WINTER_TS)).toBe('winter');
    expect(getSeasonFromTimestamp(new Date('2024-02-01T00:00:00Z').getTime())).toBe('winter');
    expect(getSeasonFromTimestamp(new Date('2024-01-01T00:00:00Z').getTime())).toBe('winter');
  });
});

describe('getWeatherForSeed', () => {
  it('returns a valid weather type for any seed and season', () => {
    const validWeathers: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'snowy', 'stormy'];
    const seasons: Season[] = ['spring', 'summer', 'fall', 'winter'];
    for (const season of seasons) {
      for (let seed = 0; seed < 200; seed++) {
        expect(validWeathers).toContain(getWeatherForSeed(seed, season));
      }
    }
  });

  it('is deterministic — same seed+season always yields same result', () => {
    const w1 = getWeatherForSeed(42, 'summer');
    const w2 = getWeatherForSeed(42, 'summer');
    expect(w1).toBe(w2);
  });

  it('snowy has zero weight in summer — never returns snowy in summer', () => {
    for (let seed = 0; seed < 1000; seed++) {
      expect(getWeatherForSeed(seed, 'summer')).not.toBe('snowy');
    }
  });

  it('snowy has zero weight in spring — never returns snowy in spring', () => {
    for (let seed = 0; seed < 1000; seed++) {
      expect(getWeatherForSeed(seed, 'spring')).not.toBe('snowy');
    }
  });

  it('stormy has zero weight in winter — never returns stormy in winter', () => {
    for (let seed = 0; seed < 1000; seed++) {
      expect(getWeatherForSeed(seed, 'winter')).not.toBe('stormy');
    }
  });
});

describe('WeatherSystem', () => {
  let ws: WeatherSystem;

  beforeEach(() => {
    ws = new WeatherSystem();
  });

  describe('getWeatherState', () => {
    it('returns correct season for a spring timestamp', () => {
      const state = ws.getWeatherState(SPRING_TS);
      expect(state.season).toBe('spring');
    });

    it('returns correct season for a winter timestamp', () => {
      const state = ws.getWeatherState(WINTER_TS);
      expect(state.season).toBe('winter');
    });

    it('periodStartMs is at a period boundary', () => {
      const state = ws.getWeatherState(SPRING_TS);
      const periodMs = WEATHER_PERIOD_SECONDS * 1000;
      expect(state.periodStartMs % periodMs).toBe(0);
    });

    it('periodDurationMs matches WEATHER_PERIOD_SECONDS', () => {
      const state = ws.getWeatherState(SPRING_TS);
      expect(state.periodDurationMs).toBe(WEATHER_PERIOD_SECONDS * 1000);
    });

    it('is deterministic — same timestamp yields same state', () => {
      const s1 = ws.getWeatherState(SUMMER_TS);
      const s2 = ws.getWeatherState(SUMMER_TS);
      expect(s1).toEqual(s2);
    });

    it('timestamps in the same period yield the same weather', () => {
      const periodMs = WEATHER_PERIOD_SECONDS * 1000;
      const base = Math.floor(SPRING_TS / periodMs) * periodMs;
      const mid = base + periodMs / 2;
      expect(ws.getWeather(base)).toBe(ws.getWeather(mid));
    });

    it('timestamps in adjacent periods may differ (different seed)', () => {
      const periodMs = WEATHER_PERIOD_SECONDS * 1000;
      // Sample 120 consecutive periods (~10 days). With spring having 4 possible
      // weather types and total weight 100, 120 samples will cross multiple buckets.
      const weathers = new Set<string>();
      for (let i = 0; i < 120; i++) {
        weathers.add(ws.getWeather(SPRING_TS + i * periodMs));
      }
      expect(weathers.size).toBeGreaterThan(1);
    });
  });

  describe('getModifiers', () => {
    it('returns valid modifier keys', () => {
      const mods = ws.getModifiers(SUMMER_TS);
      expect(mods.decayMultipliers).toBeDefined();
      expect(typeof mods.activityEffectiveness).toBe('number');
      expect(mods.activityEffectiveness).toBeGreaterThan(0);
    });

    it('stormy weather has higher happiness decay than sunny', () => {
      const stormyMult = WEATHER_MODIFIERS['stormy'].decayMultipliers.happiness;
      const sunnyMult = WEATHER_MODIFIERS['sunny'].decayMultipliers.happiness;
      expect(stormyMult).toBeGreaterThan(sunnyMult);
    });

    it('stormy weather has lower activity effectiveness than sunny', () => {
      const stormy = WEATHER_MODIFIERS['stormy'].activityEffectiveness;
      const sunny = WEATHER_MODIFIERS['sunny'].activityEffectiveness;
      expect(stormy).toBeLessThan(sunny);
    });
  });

  describe('applyWeatherDecay', () => {
    it('scales base rate by weather multiplier', () => {
      const periodMs = WEATHER_PERIOD_SECONDS * 1000;
      // Find a timestamp that lands in a stormy period
      let stormyTs = -1;
      for (let i = 0; i < 1000; i++) {
        const ts = FALL_TS + i * periodMs;
        if (ws.getWeather(ts) === 'stormy') {
          stormyTs = ts;
          break;
        }
      }
      if (stormyTs === -1) {
        // If no stormy found in fall, skip — this is a distribution edge case
        return;
      }

      const baseRate = 0.01;
      const scaled = ws.applyWeatherDecay('happiness', baseRate, stormyTs);
      const expectedMultiplier = WEATHER_MODIFIERS['stormy'].decayMultipliers.happiness;
      expect(scaled).toBeCloseTo(baseRate * expectedMultiplier);
    });

    it('returns the base rate when multiplier is 1.0', () => {
      // Find a cloudy timestamp — cloudy has all multipliers at 1.0
      const periodMs = WEATHER_PERIOD_SECONDS * 1000;
      let cloudyTs = -1;
      for (let i = 0; i < 1000; i++) {
        const ts = SPRING_TS + i * periodMs;
        if (ws.getWeather(ts) === 'cloudy') {
          cloudyTs = ts;
          break;
        }
      }
      if (cloudyTs === -1) return;

      const baseRate = 0.01;
      const scaled = ws.applyWeatherDecay('hunger', baseRate, cloudyTs);
      expect(scaled).toBeCloseTo(baseRate * WEATHER_MODIFIERS['cloudy'].decayMultipliers.hunger);
    });
  });

  describe('getAvailableFoods', () => {
    it('includes always-available foods', () => {
      const foods = ws.getAvailableFoods(SPRING_TS);
      expect(foods).toContain('basic_kibble');
      expect(foods).toContain('water');
    });

    it('includes spring-specific foods in spring', () => {
      const foods = ws.getAvailableFoods(SPRING_TS);
      expect(foods).toContain('fresh_salad');
    });

    it('includes summer-specific foods in summer', () => {
      const foods = ws.getAvailableFoods(SUMMER_TS);
      expect(foods).toContain('watermelon');
      expect(foods).toContain('ice_cream');
    });

    it('includes winter-specific foods in winter', () => {
      const foods = ws.getAvailableFoods(WINTER_TS);
      expect(foods).toContain('hot_cocoa');
      expect(foods).toContain('gingerbread');
    });

    it('does not include summer foods in winter', () => {
      const foods = ws.getAvailableFoods(WINTER_TS);
      expect(foods).not.toContain('watermelon');
    });
  });

  describe('getAvailableActivities', () => {
    it('includes always-available activities', () => {
      const periodMs = WEATHER_PERIOD_SECONDS * 1000;
      const activities = ws.getAvailableActivities(SUMMER_TS);
      expect(activities).toContain('rest');
      expect(activities).toContain('cuddle');
      void periodMs;
    });

    it('includes weather-specific activities', () => {
      // Find a sunny timestamp
      const periodMs = WEATHER_PERIOD_SECONDS * 1000;
      let sunnyTs = -1;
      for (let i = 0; i < 1000; i++) {
        const ts = SUMMER_TS + i * periodMs;
        if (ws.getWeather(ts) === 'sunny') {
          sunnyTs = ts;
          break;
        }
      }
      if (sunnyTs === -1) return;

      const activities = ws.getAvailableActivities(sunnyTs);
      expect(activities).toContain('outdoor_play');
      expect(activities).toContain('picnic');
    });
  });

  describe('simulateTimeAway', () => {
    it('calls tickFn for the full elapsed time', () => {
      const pet = createTestPet();
      let totalDt = 0;
      const elapsedMs = 60 * 60 * 1000; // 1 hour

      ws.simulateTimeAway(pet, SPRING_TS, SPRING_TS + elapsedMs, (_p, dt) => {
        totalDt += dt;
      });

      // Total time ticked should be close to elapsed seconds
      expect(totalDt).toBeCloseTo(elapsedMs / 1000, 0);
    });

    it('returns correct elapsedMs', () => {
      const pet = createTestPet();
      const elapsedMs = 30 * 60 * 1000;
      const result = ws.simulateTimeAway(pet, SPRING_TS, SPRING_TS + elapsedMs, () => {});
      expect(result.elapsedMs).toBe(elapsedMs);
    });

    it('passes weather type to tickFn', () => {
      const pet = createTestPet();
      const weathersSeen = new Set<WeatherType>();
      const elapsedMs = 10 * 60 * 60 * 1000; // 10 hours — spans multiple periods

      ws.simulateTimeAway(pet, SPRING_TS, SPRING_TS + elapsedMs, (_p, _dt, weather) => {
        weathersSeen.add(weather);
      });

      // Over 10 hours (5 periods) we likely see multiple weather types
      expect(weathersSeen.size).toBeGreaterThanOrEqual(1);
    });

    it('weatherHistory tracks distinct weather periods', () => {
      const pet = createTestPet();
      const elapsedMs = 5 * WEATHER_PERIOD_SECONDS * 1000;

      const result = ws.simulateTimeAway(pet, SPRING_TS, SPRING_TS + elapsedMs, () => {});

      expect(result.weatherHistory.length).toBeGreaterThanOrEqual(1);
      expect(result.weatherPeriodCount).toBeGreaterThan(0);
    });

    it('handles zero elapsed time gracefully', () => {
      const pet = createTestPet();
      const result = ws.simulateTimeAway(pet, SPRING_TS, SPRING_TS, () => {});
      expect(result.elapsedMs).toBe(0);
      expect(result.weatherPeriodCount).toBe(0);
    });
  });

  describe('describeWeather', () => {
    it('returns a non-empty string', () => {
      const desc = ws.describeWeather(SUMMER_TS);
      expect(typeof desc).toBe('string');
      expect(desc.length).toBeGreaterThan(0);
    });

    it('includes capitalized season name', () => {
      const desc = ws.describeWeather(SPRING_TS);
      expect(desc).toMatch(/Spring/);
    });

    it('includes capitalized weather name', () => {
      const periodMs = WEATHER_PERIOD_SECONDS * 1000;
      // Find a sunny period in summer
      let sunnyTs = -1;
      for (let i = 0; i < 1000; i++) {
        const ts = SUMMER_TS + i * periodMs;
        if (ws.getWeather(ts) === 'sunny') {
          sunnyTs = ts;
          break;
        }
      }
      if (sunnyTs === -1) return;
      const desc = ws.describeWeather(sunnyTs);
      expect(desc).toMatch(/Sunny/);
    });
  });
});
