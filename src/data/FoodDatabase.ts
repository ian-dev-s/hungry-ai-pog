/**
 * Food database with categories, stat effects, and metadata.
 * Each food item has nutritional stat impacts and personality preference weights.
 */

import type { StatName } from './StatsConfig';

export type FoodCategory =
  | 'fruits'
  | 'vegetables'
  | 'proteins'
  | 'grains'
  | 'sweets'
  | 'junk';

export interface StatEffect {
  stat: StatName;
  value: number;
}

export interface FoodItem {
  id: string;
  name: string;
  category: FoodCategory;
  effects: StatEffect[];
  /** Personality vector affinity: [playful, brave, gentle, smart] — range -1 to 1 */
  personalityAffinity: [number, number, number, number];
  /** How filling this food is (0-100). Used for overfeeding detection. */
  fillAmount: number;
  /** Cost in coins to purchase from the shop. */
  cost: number;
  /** Description shown in the UI. */
  description: string;
}

export const FOOD_DATABASE: FoodItem[] = [
  // === FRUITS ===
  {
    id: 'apple',
    name: 'Apple',
    category: 'fruits',
    effects: [
      { stat: 'hunger', value: 15 },
      { stat: 'health', value: 5 },
      { stat: 'happiness', value: 3 },
    ],
    personalityAffinity: [0.2, 0, 0.3, 0],
    fillAmount: 15,
    cost: 5,
    description: 'A crisp, juicy apple. Healthy and refreshing.',
  },
  {
    id: 'banana',
    name: 'Banana',
    category: 'fruits',
    effects: [
      { stat: 'hunger', value: 18 },
      { stat: 'energy', value: 8 },
    ],
    personalityAffinity: [0.3, 0, 0.1, 0],
    fillAmount: 18,
    cost: 4,
    description: 'An energy-packed banana. Great for active pets.',
  },
  {
    id: 'berries',
    name: 'Mixed Berries',
    category: 'fruits',
    effects: [
      { stat: 'hunger', value: 10 },
      { stat: 'happiness', value: 8 },
      { stat: 'health', value: 3 },
    ],
    personalityAffinity: [0.5, 0, 0.2, 0],
    fillAmount: 10,
    cost: 8,
    description: 'Sweet assorted berries. Pets love these!',
  },
  {
    id: 'melon',
    name: 'Watermelon Slice',
    category: 'fruits',
    effects: [
      { stat: 'hunger', value: 12 },
      { stat: 'happiness', value: 5 },
      { stat: 'hygiene', value: -3 },
    ],
    personalityAffinity: [0.4, 0, 0.1, -0.1],
    fillAmount: 12,
    cost: 6,
    description: 'Juicy watermelon. Messy but delicious!',
  },

  // === VEGETABLES ===
  {
    id: 'carrot',
    name: 'Carrot',
    category: 'vegetables',
    effects: [
      { stat: 'hunger', value: 12 },
      { stat: 'health', value: 8 },
      { stat: 'discipline', value: 2 },
    ],
    personalityAffinity: [0, 0.2, 0.2, 0.3],
    fillAmount: 12,
    cost: 3,
    description: 'A crunchy carrot. Great for health and discipline.',
  },
  {
    id: 'leafy_greens',
    name: 'Leafy Greens',
    category: 'vegetables',
    effects: [
      { stat: 'hunger', value: 8 },
      { stat: 'health', value: 10 },
      { stat: 'happiness', value: -2 },
    ],
    personalityAffinity: [-0.3, 0.1, 0, 0.5],
    fillAmount: 8,
    cost: 4,
    description: 'Nutritious greens. Healthy but not very exciting.',
  },
  {
    id: 'pumpkin',
    name: 'Pumpkin',
    category: 'vegetables',
    effects: [
      { stat: 'hunger', value: 20 },
      { stat: 'health', value: 5 },
      { stat: 'energy', value: 3 },
    ],
    personalityAffinity: [0, 0.3, 0.2, 0],
    fillAmount: 20,
    cost: 6,
    description: 'A hearty pumpkin. Very filling!',
  },
  {
    id: 'mushroom',
    name: 'Mushroom',
    category: 'vegetables',
    effects: [
      { stat: 'hunger', value: 10 },
      { stat: 'health', value: 6 },
      { stat: 'bond', value: 2 },
    ],
    personalityAffinity: [0, 0.4, 0, 0.3],
    fillAmount: 10,
    cost: 7,
    description: 'A savory mushroom. Acquired taste, but nutritious.',
  },

  // === PROTEINS ===
  {
    id: 'fish',
    name: 'Grilled Fish',
    category: 'proteins',
    effects: [
      { stat: 'hunger', value: 25 },
      { stat: 'health', value: 5 },
      { stat: 'energy', value: 5 },
    ],
    personalityAffinity: [0, 0.3, 0, 0.2],
    fillAmount: 25,
    cost: 10,
    description: 'A perfectly grilled fish. Hearty and filling.',
  },
  {
    id: 'egg_food',
    name: 'Boiled Egg',
    category: 'proteins',
    effects: [
      { stat: 'hunger', value: 15 },
      { stat: 'energy', value: 8 },
      { stat: 'health', value: 3 },
    ],
    personalityAffinity: [0.1, 0.1, 0.1, 0.1],
    fillAmount: 15,
    cost: 5,
    description: 'A simple boiled egg. Good all-around nutrition.',
  },
  {
    id: 'steak',
    name: 'Steak',
    category: 'proteins',
    effects: [
      { stat: 'hunger', value: 30 },
      { stat: 'energy', value: 10 },
      { stat: 'happiness', value: 5 },
    ],
    personalityAffinity: [0.2, 0.5, -0.1, 0],
    fillAmount: 30,
    cost: 15,
    description: 'A juicy steak. Your pet will love this!',
  },
  {
    id: 'nuts',
    name: 'Mixed Nuts',
    category: 'proteins',
    effects: [
      { stat: 'hunger', value: 12 },
      { stat: 'energy', value: 6 },
      { stat: 'health', value: 4 },
    ],
    personalityAffinity: [0, 0, 0, 0.4],
    fillAmount: 12,
    cost: 6,
    description: 'Crunchy mixed nuts. A smart snack!',
  },

  // === GRAINS ===
  {
    id: 'bread',
    name: 'Fresh Bread',
    category: 'grains',
    effects: [
      { stat: 'hunger', value: 20 },
      { stat: 'happiness', value: 3 },
    ],
    personalityAffinity: [0, 0, 0.3, 0],
    fillAmount: 20,
    cost: 4,
    description: 'Warm, fresh-baked bread. Comfort food.',
  },
  {
    id: 'rice_bowl',
    name: 'Rice Bowl',
    category: 'grains',
    effects: [
      { stat: 'hunger', value: 22 },
      { stat: 'energy', value: 5 },
    ],
    personalityAffinity: [0, 0, 0.2, 0.2],
    fillAmount: 22,
    cost: 5,
    description: 'A bowl of fluffy rice. Simple and satisfying.',
  },
  {
    id: 'oatmeal',
    name: 'Oatmeal',
    category: 'grains',
    effects: [
      { stat: 'hunger', value: 18 },
      { stat: 'health', value: 5 },
      { stat: 'energy', value: 5 },
    ],
    personalityAffinity: [-0.1, 0, 0.3, 0.2],
    fillAmount: 18,
    cost: 4,
    description: 'Warm oatmeal. Steady energy and good health.',
  },
  {
    id: 'pasta',
    name: 'Pasta',
    category: 'grains',
    effects: [
      { stat: 'hunger', value: 25 },
      { stat: 'energy', value: 8 },
      { stat: 'happiness', value: 4 },
    ],
    personalityAffinity: [0.3, 0, 0.2, 0],
    fillAmount: 25,
    cost: 7,
    description: 'Tasty pasta. Energizing and fun to eat!',
  },

  // === SWEETS ===
  {
    id: 'cookie',
    name: 'Cookie',
    category: 'sweets',
    effects: [
      { stat: 'hunger', value: 8 },
      { stat: 'happiness', value: 15 },
      { stat: 'energy', value: 5 },
      { stat: 'health', value: -3 },
    ],
    personalityAffinity: [0.5, 0, 0.2, -0.2],
    fillAmount: 8,
    cost: 6,
    description: 'A sweet cookie. Lots of happiness, not so healthy.',
  },
  {
    id: 'honey',
    name: 'Honey Drop',
    category: 'sweets',
    effects: [
      { stat: 'hunger', value: 5 },
      { stat: 'happiness', value: 10 },
      { stat: 'energy', value: 10 },
    ],
    personalityAffinity: [0.3, 0, 0.3, 0],
    fillAmount: 5,
    cost: 8,
    description: 'Pure golden honey. Sweet burst of energy!',
  },
  {
    id: 'cake_slice',
    name: 'Cake Slice',
    category: 'sweets',
    effects: [
      { stat: 'hunger', value: 12 },
      { stat: 'happiness', value: 20 },
      { stat: 'health', value: -5 },
      { stat: 'discipline', value: -3 },
    ],
    personalityAffinity: [0.6, 0, 0, -0.3],
    fillAmount: 12,
    cost: 12,
    description: 'A decadent cake slice. Pure joy, zero discipline.',
  },
  {
    id: 'fruit_juice',
    name: 'Fruit Juice',
    category: 'sweets',
    effects: [
      { stat: 'hunger', value: 5 },
      { stat: 'happiness', value: 8 },
      { stat: 'health', value: 2 },
      { stat: 'energy', value: 6 },
    ],
    personalityAffinity: [0.3, 0, 0.2, 0.1],
    fillAmount: 5,
    cost: 5,
    description: 'Fresh-squeezed juice. Sweet and somewhat healthy.',
  },

  // === JUNK FOOD ===
  {
    id: 'chips',
    name: 'Crispy Chips',
    category: 'junk',
    effects: [
      { stat: 'hunger', value: 10 },
      { stat: 'happiness', value: 12 },
      { stat: 'health', value: -5 },
      { stat: 'hygiene', value: -5 },
    ],
    personalityAffinity: [0.4, 0.2, -0.2, -0.3],
    fillAmount: 10,
    cost: 4,
    description: 'Salty, greasy chips. Tasty but unhealthy.',
  },
  {
    id: 'candy',
    name: 'Candy',
    category: 'junk',
    effects: [
      { stat: 'hunger', value: 3 },
      { stat: 'happiness', value: 18 },
      { stat: 'energy', value: 12 },
      { stat: 'health', value: -8 },
      { stat: 'discipline', value: -5 },
    ],
    personalityAffinity: [0.6, 0, -0.1, -0.4],
    fillAmount: 3,
    cost: 3,
    description: 'Sugary candy. Maximum fun, maximum regret.',
  },
  {
    id: 'pizza_slice',
    name: 'Pizza Slice',
    category: 'junk',
    effects: [
      { stat: 'hunger', value: 22 },
      { stat: 'happiness', value: 15 },
      { stat: 'health', value: -4 },
      { stat: 'hygiene', value: -3 },
    ],
    personalityAffinity: [0.5, 0.1, 0, -0.2],
    fillAmount: 22,
    cost: 8,
    description: 'Cheesy pizza. Delicious but messy and unhealthy.',
  },
  {
    id: 'soda',
    name: 'Fizzy Soda',
    category: 'junk',
    effects: [
      { stat: 'hunger', value: 2 },
      { stat: 'happiness', value: 10 },
      { stat: 'energy', value: 15 },
      { stat: 'health', value: -6 },
    ],
    personalityAffinity: [0.4, 0.1, -0.2, -0.3],
    fillAmount: 2,
    cost: 3,
    description: 'Bubbly soda. Sugar rush incoming!',
  },
];

/** Look up a food item by its id. */
export function getFoodById(id: string): FoodItem | undefined {
  return FOOD_DATABASE.find((f) => f.id === id);
}

/** Get all food items in a given category. */
export function getFoodByCategory(category: FoodCategory): FoodItem[] {
  return FOOD_DATABASE.filter((f) => f.category === category);
}

/** All available food categories in display order. */
export const FOOD_CATEGORIES: FoodCategory[] = [
  'fruits',
  'vegetables',
  'proteins',
  'grains',
  'sweets',
  'junk',
];

/** Display label for each category. */
export const CATEGORY_LABELS: Record<FoodCategory, string> = {
  fruits: 'Fruits',
  vegetables: 'Vegetables',
  proteins: 'Proteins',
  grains: 'Grains',
  sweets: 'Sweets',
  junk: 'Junk Food',
};
