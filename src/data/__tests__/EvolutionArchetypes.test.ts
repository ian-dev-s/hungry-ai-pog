import { describe, it, expect } from 'vitest';
import {
  ALL_ARCHETYPES,
  getArchetypesForElement,
  getArchetypeById,
  createDefaultCareHistory,
} from '@data/EvolutionArchetypes';

describe('EvolutionArchetypes', () => {
  it('has at least 20 archetypes total', () => {
    expect(ALL_ARCHETYPES.length).toBeGreaterThanOrEqual(20);
  });

  it('covers all 4 elemental categories', () => {
    const elements = new Set(ALL_ARCHETYPES.map((a) => a.element));
    expect(elements).toEqual(new Set(['forest', 'aquatic', 'fire', 'cosmic']));
  });

  it('each element has at least one secret archetype', () => {
    for (const element of ['forest', 'aquatic', 'fire', 'cosmic'] as const) {
      const secrets = getArchetypesForElement(element).filter((a) => a.secret);
      expect(secrets.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('archetype weights sum to approximately 1.0', () => {
    for (const archetype of ALL_ARCHETYPES) {
      const sum = Object.values(archetype.weights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 2);
    }
  });

  it('all archetype IDs are unique', () => {
    const ids = ALL_ARCHETYPES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  describe('getArchetypesForElement', () => {
    it('returns only forest archetypes for forest', () => {
      const forest = getArchetypesForElement('forest');
      expect(forest.length).toBeGreaterThan(0);
      for (const a of forest) {
        expect(a.element).toBe('forest');
      }
    });
  });

  describe('getArchetypeById', () => {
    it('finds archetype by ID', () => {
      const a = getArchetypeById('ember_drake');
      expect(a).toBeDefined();
      expect(a!.name).toBe('Ember Drake');
    });

    it('returns undefined for unknown ID', () => {
      expect(getArchetypeById('nonexistent')).toBeUndefined();
    });
  });

  describe('createDefaultCareHistory', () => {
    it('returns sensible defaults', () => {
      const history = createDefaultCareHistory();
      expect(history.happinessAvg).toBe(50);
      expect(history.disciplineRatio).toBe(0.5);
      expect(history.uniqueFoodsCount).toBe(0);
      expect(history.activitiesCompleted).toBe(0);
      expect(history.bondAvg).toBe(50);
      expect(history.secretFlags).toEqual({});
    });
  });
});
