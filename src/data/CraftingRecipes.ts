/**
 * Crafting recipes for combining exploration materials into usable items.
 * Materials (wood, stone, crystal, fabric, herbs) are found during exploration.
 */

export type MaterialType = 'wood' | 'stone' | 'crystal' | 'fabric' | 'herbs';

export type CraftingCategory = 'furniture' | 'toys' | 'meals' | 'accessories';

export interface MaterialCost {
  material: MaterialType;
  amount: number;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  category: CraftingCategory;
  /** Materials required to craft this item. */
  materials: MaterialCost[];
  /** Coin cost in addition to materials. */
  coinCost: number;
  /** The item id produced by this recipe. */
  outputItemId: string;
  /** Number of items produced per craft. */
  outputQuantity: number;
  /** Description shown in the crafting UI. */
  description: string;
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  // === FURNITURE ===
  {
    id: 'craft_wooden_shelf',
    name: 'Wooden Shelf',
    category: 'furniture',
    materials: [
      { material: 'wood', amount: 3 },
      { material: 'stone', amount: 1 },
    ],
    coinCost: 10,
    outputItemId: 'bookshelf',
    outputQuantity: 1,
    description: 'A sturdy wooden shelf for books and trinkets.',
  },
  {
    id: 'craft_stone_lamp',
    name: 'Stone Lamp',
    category: 'furniture',
    materials: [
      { material: 'stone', amount: 2 },
      { material: 'crystal', amount: 1 },
    ],
    coinCost: 15,
    outputItemId: 'nightlight',
    outputQuantity: 1,
    description: 'A lamp carved from stone with a crystal glow.',
  },
  {
    id: 'craft_planter',
    name: 'Planter Box',
    category: 'furniture',
    materials: [
      { material: 'wood', amount: 2 },
      { material: 'herbs', amount: 2 },
    ],
    coinCost: 8,
    outputItemId: 'potted_plant',
    outputQuantity: 1,
    description: 'A wooden planter with fresh herbs.',
  },
  {
    id: 'craft_music_box',
    name: 'Crystal Music Box',
    category: 'furniture',
    materials: [
      { material: 'wood', amount: 1 },
      { material: 'crystal', amount: 3 },
    ],
    coinCost: 20,
    outputItemId: 'music_box',
    outputQuantity: 1,
    description: 'A music box powered by resonating crystals.',
  },
  {
    id: 'craft_cozy_bed',
    name: 'Cozy Pet Bed',
    category: 'furniture',
    materials: [
      { material: 'wood', amount: 2 },
      { material: 'fabric', amount: 3 },
    ],
    coinCost: 15,
    outputItemId: 'cozy_bed',
    outputQuantity: 1,
    description: 'A soft bed crafted with plush fabric.',
  },

  // === TOYS ===
  {
    id: 'craft_wooden_toy',
    name: 'Wooden Toy',
    category: 'toys',
    materials: [{ material: 'wood', amount: 2 }],
    coinCost: 5,
    outputItemId: 'toy_box',
    outputQuantity: 1,
    description: 'A hand-carved wooden toy. Fun to play with!',
  },
  {
    id: 'craft_crystal_ball',
    name: 'Crystal Ball',
    category: 'toys',
    materials: [
      { material: 'crystal', amount: 2 },
      { material: 'stone', amount: 1 },
    ],
    coinCost: 12,
    outputItemId: 'crystal_ball_toy',
    outputQuantity: 1,
    description: 'A shimmering crystal ball. Mesmerizing!',
  },
  {
    id: 'craft_fabric_doll',
    name: 'Fabric Doll',
    category: 'toys',
    materials: [
      { material: 'fabric', amount: 2 },
      { material: 'herbs', amount: 1 },
    ],
    coinCost: 8,
    outputItemId: 'fabric_doll_toy',
    outputQuantity: 1,
    description: 'A soft doll stuffed with fragrant herbs.',
  },

  // === MEALS ===
  {
    id: 'craft_herbal_tea',
    name: 'Herbal Tea',
    category: 'meals',
    materials: [{ material: 'herbs', amount: 2 }],
    coinCost: 3,
    outputItemId: 'herbal_tea',
    outputQuantity: 2,
    description: 'Calming herbal tea. Restores health and energy.',
  },
  {
    id: 'craft_herb_salad',
    name: 'Herb Salad',
    category: 'meals',
    materials: [
      { material: 'herbs', amount: 3 },
      { material: 'crystal', amount: 1 },
    ],
    coinCost: 5,
    outputItemId: 'herb_salad',
    outputQuantity: 1,
    description: 'A magical salad infused with crystal energy.',
  },
  {
    id: 'craft_stone_oven_bread',
    name: 'Stone-Oven Bread',
    category: 'meals',
    materials: [
      { material: 'stone', amount: 1 },
      { material: 'herbs', amount: 1 },
      { material: 'wood', amount: 1 },
    ],
    coinCost: 4,
    outputItemId: 'bread',
    outputQuantity: 3,
    description: 'Bread baked in a stone oven. Hearty and warm.',
  },

  // === ACCESSORIES ===
  {
    id: 'craft_flower_crown',
    name: 'Flower Crown',
    category: 'accessories',
    materials: [
      { material: 'herbs', amount: 2 },
      { material: 'fabric', amount: 1 },
    ],
    coinCost: 5,
    outputItemId: 'flower_crown',
    outputQuantity: 1,
    description: 'A beautiful crown woven from flowers.',
  },
  {
    id: 'craft_crystal_pendant',
    name: 'Crystal Pendant',
    category: 'accessories',
    materials: [
      { material: 'crystal', amount: 2 },
      { material: 'fabric', amount: 1 },
    ],
    coinCost: 10,
    outputItemId: 'crystal_pendant',
    outputQuantity: 1,
    description: 'A pendant with a glowing crystal shard.',
  },
  {
    id: 'craft_woven_scarf',
    name: 'Woven Scarf',
    category: 'accessories',
    materials: [{ material: 'fabric', amount: 3 }],
    coinCost: 6,
    outputItemId: 'scarf',
    outputQuantity: 1,
    description: 'A colorful hand-woven scarf.',
  },
  {
    id: 'craft_stone_bracelet',
    name: 'Stone Bracelet',
    category: 'accessories',
    materials: [
      { material: 'stone', amount: 2 },
      { material: 'crystal', amount: 1 },
    ],
    coinCost: 8,
    outputItemId: 'stone_bracelet',
    outputQuantity: 1,
    description: 'A polished stone bracelet with crystal inlays.',
  },
];

/** All material types in display order. */
export const MATERIAL_TYPES: MaterialType[] = [
  'wood',
  'stone',
  'crystal',
  'fabric',
  'herbs',
];

/** Display label for each material type. */
export const MATERIAL_LABELS: Record<MaterialType, string> = {
  wood: 'Wood',
  stone: 'Stone',
  crystal: 'Crystal',
  fabric: 'Fabric',
  herbs: 'Herbs',
};

/** Display label for each crafting category. */
export const CRAFTING_CATEGORY_LABELS: Record<CraftingCategory, string> = {
  furniture: 'Furniture',
  toys: 'Toys',
  meals: 'Meals',
  accessories: 'Accessories',
};

/** Look up a crafting recipe by its id. */
export function getCraftingRecipeById(id: string): CraftingRecipe | undefined {
  return CRAFTING_RECIPES.find((r) => r.id === id);
}

/** Get all crafting recipes in a given category. */
export function getCraftingRecipesByCategory(
  category: CraftingCategory,
): CraftingRecipe[] {
  return CRAFTING_RECIPES.filter((r) => r.category === category);
}
