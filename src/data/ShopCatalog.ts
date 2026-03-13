/**
 * Shop catalog with purchasable items organized by category.
 * All items are earnable through gameplay — no real-money purchases.
 */

export type ShopCategory = 'food' | 'medicine' | 'room' | 'cosmetics';

export interface ShopItem {
  id: string;
  name: string;
  category: ShopCategory;
  /** Cost in coins. */
  cost: number;
  /** Description shown in the shop UI. */
  description: string;
  /** Optional stat effects when used (medicine items). */
  effects?: { stat: string; value: number }[];
  /** Whether this item is a one-time unlock (room/cosmetics) vs consumable. */
  isUnlock: boolean;
}

export const SHOP_CATALOG: ShopItem[] = [
  // === FOOD ===
  {
    id: 'apple',
    name: 'Apple',
    category: 'food',
    cost: 5,
    description: 'A crisp, juicy apple. Healthy and refreshing.',
    isUnlock: false,
  },
  {
    id: 'banana',
    name: 'Banana',
    category: 'food',
    cost: 4,
    description: 'An energy-packed banana. Great for active pets.',
    isUnlock: false,
  },
  {
    id: 'berries',
    name: 'Mixed Berries',
    category: 'food',
    cost: 8,
    description: 'Sweet assorted berries. Pets love these!',
    isUnlock: false,
  },
  {
    id: 'steak',
    name: 'Steak',
    category: 'food',
    cost: 15,
    description: 'A juicy steak. Your pet will love this!',
    isUnlock: false,
  },
  {
    id: 'bread',
    name: 'Fresh Bread',
    category: 'food',
    cost: 4,
    description: 'Warm, fresh-baked bread. Comfort food.',
    isUnlock: false,
  },
  {
    id: 'fish',
    name: 'Grilled Fish',
    category: 'food',
    cost: 10,
    description: 'A perfectly grilled fish. Hearty and filling.',
    isUnlock: false,
  },
  {
    id: 'cookie',
    name: 'Cookie',
    category: 'food',
    cost: 6,
    description: 'A sweet cookie. Lots of happiness, not so healthy.',
    isUnlock: false,
  },
  {
    id: 'honey',
    name: 'Honey Drop',
    category: 'food',
    cost: 8,
    description: 'Pure golden honey. Sweet burst of energy!',
    isUnlock: false,
  },

  // === MEDICINE ===
  {
    id: 'basic_medicine',
    name: 'Basic Medicine',
    category: 'medicine',
    cost: 15,
    description: 'Cures mild illnesses like colds and fatigue.',
    effects: [{ stat: 'health', value: 20 }],
    isUnlock: false,
  },
  {
    id: 'strong_medicine',
    name: 'Strong Medicine',
    category: 'medicine',
    cost: 30,
    description: 'Cures serious illnesses like flu and infections.',
    effects: [{ stat: 'health', value: 40 }],
    isUnlock: false,
  },
  {
    id: 'antidote',
    name: 'Antidote',
    category: 'medicine',
    cost: 25,
    description: 'Neutralizes poisoning effects.',
    effects: [{ stat: 'health', value: 30 }],
    isUnlock: false,
  },
  {
    id: 'vitamin_boost',
    name: 'Vitamin Boost',
    category: 'medicine',
    cost: 10,
    description: 'Prevents illness for a short period and boosts energy.',
    effects: [
      { stat: 'health', value: 10 },
      { stat: 'energy', value: 15 },
    ],
    isUnlock: false,
  },

  // === ROOM ITEMS ===
  {
    id: 'cozy_bed',
    name: 'Cozy Bed',
    category: 'room',
    cost: 50,
    description: 'A soft bed for your pet. Improves sleep quality.',
    isUnlock: true,
  },
  {
    id: 'toy_box',
    name: 'Toy Box',
    category: 'room',
    cost: 35,
    description: 'A collection of toys. Boosts happiness over time.',
    isUnlock: true,
  },
  {
    id: 'bookshelf',
    name: 'Bookshelf',
    category: 'room',
    cost: 40,
    description: 'A bookshelf for smart pets. Improves discipline.',
    isUnlock: true,
  },
  {
    id: 'potted_plant',
    name: 'Potted Plant',
    category: 'room',
    cost: 20,
    description: 'A decorative plant. Makes the room feel alive.',
    isUnlock: true,
  },
  {
    id: 'nightlight',
    name: 'Nightlight',
    category: 'room',
    cost: 25,
    description: 'A gentle nightlight. Helps nervous pets sleep.',
    isUnlock: true,
  },
  {
    id: 'music_box',
    name: 'Music Box',
    category: 'room',
    cost: 45,
    description: 'Plays soothing melodies. Reduces stress.',
    isUnlock: true,
  },

  // === COSMETICS ===
  {
    id: 'red_bow',
    name: 'Red Bow',
    category: 'cosmetics',
    cost: 15,
    description: 'A cute red bow accessory.',
    isUnlock: true,
  },
  {
    id: 'top_hat',
    name: 'Top Hat',
    category: 'cosmetics',
    cost: 25,
    description: 'A dapper top hat. Very distinguished!',
    isUnlock: true,
  },
  {
    id: 'flower_crown',
    name: 'Flower Crown',
    category: 'cosmetics',
    cost: 20,
    description: 'A crown of fresh flowers. Beautiful!',
    isUnlock: true,
  },
  {
    id: 'sunglasses',
    name: 'Sunglasses',
    category: 'cosmetics',
    cost: 18,
    description: 'Cool shades. Your pet looks awesome!',
    isUnlock: true,
  },
  {
    id: 'scarf',
    name: 'Cozy Scarf',
    category: 'cosmetics',
    cost: 12,
    description: 'A warm, colorful scarf.',
    isUnlock: true,
  },
  {
    id: 'bandana',
    name: 'Bandana',
    category: 'cosmetics',
    cost: 10,
    description: 'A stylish bandana. Adventure-ready!',
    isUnlock: true,
  },
];

/** Look up a shop item by its id. */
export function getShopItemById(id: string): ShopItem | undefined {
  return SHOP_CATALOG.find((item) => item.id === id);
}

/** Get all shop items in a given category. */
export function getShopItemsByCategory(category: ShopCategory): ShopItem[] {
  return SHOP_CATALOG.filter((item) => item.category === category);
}

/** All available shop categories in display order. */
export const SHOP_CATEGORIES: ShopCategory[] = [
  'food',
  'medicine',
  'room',
  'cosmetics',
];

/** Display label for each category. */
export const SHOP_CATEGORY_LABELS: Record<ShopCategory, string> = {
  food: 'Food',
  medicine: 'Medicine',
  room: 'Room Items',
  cosmetics: 'Cosmetics',
};
