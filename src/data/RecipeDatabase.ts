/**
 * Recipe database for combining food ingredients into meals.
 * Recipes provide bonus effects beyond the sum of their ingredients.
 */

import type { StatEffect } from './FoodDatabase';

export interface Recipe {
  id: string;
  name: string;
  /** Food item IDs required as ingredients. */
  ingredients: string[];
  /** Bonus stat effects on top of individual ingredient effects. */
  bonusEffects: StatEffect[];
  /** Total fill amount (overrides sum of ingredients). */
  fillAmount: number;
  /** Cost to craft (in coins, for any additional materials). */
  craftCost: number;
  description: string;
}

export const RECIPE_DATABASE: Recipe[] = [
  {
    id: 'fruit_salad',
    name: 'Fruit Salad',
    ingredients: ['apple', 'berries', 'honey'],
    bonusEffects: [
      { stat: 'happiness', value: 10 },
      { stat: 'health', value: 8 },
    ],
    fillAmount: 25,
    cost: 0,
    craftCost: 0,
    description: 'A refreshing fruit salad with honey drizzle.',
  },
  {
    id: 'veggie_stew',
    name: 'Veggie Stew',
    ingredients: ['carrot', 'pumpkin', 'mushroom'],
    bonusEffects: [
      { stat: 'health', value: 15 },
      { stat: 'hunger', value: 10 },
    ],
    fillAmount: 35,
    cost: 0,
    craftCost: 2,
    description: 'A hearty vegetable stew. Warms the soul.',
  },
  {
    id: 'power_bowl',
    name: 'Power Bowl',
    ingredients: ['rice_bowl', 'fish', 'leafy_greens'],
    bonusEffects: [
      { stat: 'energy', value: 15 },
      { stat: 'health', value: 10 },
      { stat: 'discipline', value: 5 },
    ],
    fillAmount: 40,
    cost: 0,
    craftCost: 3,
    description: 'A balanced power bowl. Peak nutrition!',
  },
  {
    id: 'breakfast_plate',
    name: 'Breakfast Plate',
    ingredients: ['egg_food', 'bread', 'fruit_juice'],
    bonusEffects: [
      { stat: 'energy', value: 12 },
      { stat: 'happiness', value: 8 },
    ],
    fillAmount: 30,
    cost: 0,
    craftCost: 2,
    description: 'A full breakfast. Perfect way to start the day!',
  },
  {
    id: 'supreme_feast',
    name: 'Supreme Feast',
    ingredients: ['steak', 'pasta', 'berries'],
    bonusEffects: [
      { stat: 'happiness', value: 20 },
      { stat: 'bond', value: 10 },
      { stat: 'energy', value: 10 },
    ],
    fillAmount: 50,
    cost: 0,
    craftCost: 5,
    description: 'An extravagant feast! Your pet will adore you.',
  },
  {
    id: 'trail_mix',
    name: 'Trail Mix',
    ingredients: ['nuts', 'berries', 'oatmeal'],
    bonusEffects: [
      { stat: 'energy', value: 12 },
      { stat: 'health', value: 5 },
    ],
    fillAmount: 28,
    cost: 0,
    craftCost: 1,
    description: 'A crunchy trail mix. Great energy for adventures.',
  },
  {
    id: 'sweet_porridge',
    name: 'Sweet Porridge',
    ingredients: ['oatmeal', 'honey', 'banana'],
    bonusEffects: [
      { stat: 'happiness', value: 12 },
      { stat: 'energy', value: 8 },
    ],
    fillAmount: 30,
    cost: 0,
    craftCost: 1,
    description: 'Warm porridge with honey and banana. Comforting!',
  },
  {
    id: 'garden_wrap',
    name: 'Garden Wrap',
    ingredients: ['bread', 'leafy_greens', 'carrot'],
    bonusEffects: [
      { stat: 'health', value: 12 },
      { stat: 'discipline', value: 4 },
    ],
    fillAmount: 30,
    cost: 0,
    craftCost: 1,
    description: 'A fresh veggie wrap. Healthy and disciplined choice.',
  },
];

/** Look up a recipe by its id. */
export function getRecipeById(id: string): Recipe | undefined {
  return RECIPE_DATABASE.find((r) => r.id === id);
}

/** Find recipes that can be made with the given available food item IDs. */
export function getAvailableRecipes(availableFoodIds: string[]): Recipe[] {
  return RECIPE_DATABASE.filter((recipe) =>
    recipe.ingredients.every((ing) => availableFoodIds.includes(ing)),
  );
}
