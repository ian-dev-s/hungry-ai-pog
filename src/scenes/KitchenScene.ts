import type { Scene } from '@engine/SceneManager';
import type { Renderer } from '@engine/Renderer';
import type { InventoryItem } from '@data/SaveSchema';
import {
  FOOD_CATEGORIES,
  CATEGORY_LABELS,
  getFoodByCategory,
  type FoodCategory,
  type FoodItem,
} from '@data/FoodDatabase';
import { getAvailableRecipes, type Recipe } from '@data/RecipeDatabase';
import type { FeedingResult, FeedingReaction } from '@systems/FeedingSystem';

type KitchenTab = 'pantry' | 'recipes';

interface AnimationState {
  active: boolean;
  timer: number;
  reaction: FeedingReaction;
}

export class KitchenScene implements Scene {
  readonly name = 'kitchen';

  private onBack: () => void;
  private onFeedFood: (foodId: string) => FeedingResult | null;
  private onFeedRecipe: (
    recipeId: string,
  ) => { result: FeedingResult; coinsSpent: number } | null;
  private getInventory: () => InventoryItem[];
  private getCoins: () => number;
  private getFullness: () => number;

  private tab: KitchenTab = 'pantry';
  private selectedCategory = 0;
  private selectedItem = 0;
  private scrollOffset = 0;
  private animation: AnimationState = {
    active: false,
    timer: 0,
    reaction: 'neutral',
  };
  private elapsed = 0;

  constructor(
    onBack: () => void,
    onFeedFood: (foodId: string) => FeedingResult | null,
    onFeedRecipe: (
      recipeId: string,
    ) => { result: FeedingResult; coinsSpent: number } | null,
    getInventory: () => InventoryItem[],
    getCoins: () => number,
    getFullness: () => number,
  ) {
    this.onBack = onBack;
    this.onFeedFood = onFeedFood;
    this.onFeedRecipe = onFeedRecipe;
    this.getInventory = getInventory;
    this.getCoins = getCoins;
    this.getFullness = getFullness;
  }

  enter(): void {
    this.selectedCategory = 0;
    this.selectedItem = 0;
    this.scrollOffset = 0;
    this.tab = 'pantry';
    this.elapsed = 0;
    document.addEventListener('keydown', this.handleKey);
  }

  exit(): void {
    document.removeEventListener('keydown', this.handleKey);
  }

  private handleKey = (e: KeyboardEvent): void => {
    if (this.animation.active) return;

    if (e.key === 'Escape') {
      this.onBack();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      this.tab = this.tab === 'pantry' ? 'recipes' : 'pantry';
      this.selectedItem = 0;
      this.scrollOffset = 0;
      return;
    }

    if (this.tab === 'pantry') {
      this.handlePantryKey(e);
    } else {
      this.handleRecipeKey(e);
    }
  };

  private handlePantryKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowLeft') {
      this.selectedCategory =
        (this.selectedCategory - 1 + FOOD_CATEGORIES.length) %
        FOOD_CATEGORIES.length;
      this.selectedItem = 0;
      this.scrollOffset = 0;
    } else if (e.key === 'ArrowRight') {
      this.selectedCategory =
        (this.selectedCategory + 1) % FOOD_CATEGORIES.length;
      this.selectedItem = 0;
      this.scrollOffset = 0;
    } else if (e.key === 'ArrowUp') {
      this.selectedItem = Math.max(0, this.selectedItem - 1);
      this.adjustScroll();
    } else if (e.key === 'ArrowDown') {
      const items = this.getCurrentFoodItems();
      this.selectedItem = Math.min(items.length - 1, this.selectedItem + 1);
      this.adjustScroll();
    } else if (e.key === 'Enter') {
      this.tryFeedSelected();
    }
  }

  private handleRecipeKey(e: KeyboardEvent): void {
    const recipes = this.getAvailableRecipeList();
    if (e.key === 'ArrowUp') {
      this.selectedItem = Math.max(0, this.selectedItem - 1);
    } else if (e.key === 'ArrowDown') {
      this.selectedItem = Math.min(recipes.length - 1, this.selectedItem + 1);
    } else if (e.key === 'Enter' && recipes.length > 0) {
      this.tryCookSelected(recipes);
    }
  }

  private getCurrentFoodItems(): FoodItem[] {
    const category = FOOD_CATEGORIES[this.selectedCategory];
    const allInCategory = getFoodByCategory(category);
    const inventory = this.getInventory();
    // Only show items the player has
    return allInCategory.filter((food) => {
      const inv = inventory.find((i) => i.id === food.id);
      return inv && inv.quantity > 0;
    });
  }

  private getAvailableRecipeList(): Recipe[] {
    const inventory = this.getInventory();
    const availableIds = inventory
      .filter((i) => i.quantity > 0)
      .map((i) => i.id);
    return getAvailableRecipes(availableIds);
  }

  private tryFeedSelected(): void {
    const items = this.getCurrentFoodItems();
    if (items.length === 0 || this.selectedItem >= items.length) return;

    const food = items[this.selectedItem];
    const result = this.onFeedFood(food.id);
    if (result) {
      this.startAnimation(result.reaction);
    }
  }

  private tryCookSelected(recipes: Recipe[]): void {
    if (this.selectedItem >= recipes.length) return;

    const recipe = recipes[this.selectedItem];
    const result = this.onFeedRecipe(recipe.id);
    if (result) {
      this.startAnimation(result.result.reaction);
    }
  }

  private startAnimation(reaction: FeedingReaction): void {
    this.animation = { active: true, timer: 1.5, reaction };
  }

  private adjustScroll(): void {
    const maxVisible = 5;
    if (this.selectedItem < this.scrollOffset) {
      this.scrollOffset = this.selectedItem;
    } else if (this.selectedItem >= this.scrollOffset + maxVisible) {
      this.scrollOffset = this.selectedItem - maxVisible + 1;
    }
  }

  update(dt: number): void {
    this.elapsed += dt;
    if (this.animation.active) {
      this.animation.timer -= dt;
      if (this.animation.timer <= 0) {
        this.animation.active = false;
      }
    }
  }

  render(renderer: Renderer): void {
    renderer.clear('#1a1a3e');
    const { ctx, width, height } = renderer;

    // Header
    ctx.fillStyle = '#e94560';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Kitchen', width / 2, 30);

    // Coins display
    ctx.fillStyle = '#ffd700';
    ctx.font = '14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`Coins: ${this.getCoins()}`, width - 16, 30);

    // Fullness bar
    this.renderFullnessBar(ctx, width);

    // Tabs
    this.renderTabs(ctx, width);

    // Content area
    if (this.animation.active) {
      this.renderFeedingAnimation(ctx, width, height);
    } else if (this.tab === 'pantry') {
      this.renderPantry(ctx, width, height);
    } else {
      this.renderRecipes(ctx, width, height);
    }

    // Footer
    ctx.fillStyle = '#666';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      'Tab=switch | Arrows=navigate | Enter=feed | ESC=back',
      width / 2,
      height - 16,
    );
  }

  private renderFullnessBar(ctx: CanvasRenderingContext2D, width: number): void {
    const barX = 16;
    const barY = 50;
    const barW = width - 32;
    const barH = 12;
    const fullness = this.getFullness();

    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, barH);

    const fillColor =
      fullness > 85 ? '#e94560' : fullness > 60 ? '#ffa500' : '#4ecca3';
    ctx.fillStyle = fillColor;
    ctx.fillRect(barX, barY, barW * (fullness / 100), barH);

    ctx.strokeStyle = '#555';
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = '#e0e0e0';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Fullness: ${Math.round(fullness)}%`, barX, barY + barH + 12);
  }

  private renderTabs(ctx: CanvasRenderingContext2D, width: number): void {
    const tabY = 82;
    const tabs: { label: string; key: KitchenTab }[] = [
      { label: 'Pantry', key: 'pantry' },
      { label: 'Recipes', key: 'recipes' },
    ];

    ctx.font = '16px monospace';
    tabs.forEach((t, i) => {
      const x = (width / 3) * (i + 1);
      ctx.fillStyle = this.tab === t.key ? '#e94560' : '#666';
      ctx.textAlign = 'center';
      ctx.fillText(t.label, x, tabY);
      if (this.tab === t.key) {
        ctx.fillRect(x - 30, tabY + 5, 60, 2);
      }
    });
  }

  private renderPantry(
    ctx: CanvasRenderingContext2D,
    width: number,
    _height: number,
  ): void {
    const startY = 110;

    // Category selector
    const category = FOOD_CATEGORIES[this.selectedCategory];
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `< ${CATEGORY_LABELS[category]} >`,
      width / 2,
      startY,
    );

    // Food items
    const items = this.getCurrentFoodItems();
    const inventory = this.getInventory();

    if (items.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '14px monospace';
      ctx.fillText('No items in this category', width / 2, startY + 60);
      return;
    }

    const itemStartY = startY + 30;
    const itemHeight = 70;
    const maxVisible = 5;

    for (let i = 0; i < maxVisible && i + this.scrollOffset < items.length; i++) {
      const idx = i + this.scrollOffset;
      const food = items[idx];
      const inv = inventory.find((it) => it.id === food.id);
      const qty = inv?.quantity ?? 0;
      const y = itemStartY + i * itemHeight;
      const selected = idx === this.selectedItem;

      // Selection highlight
      if (selected) {
        ctx.fillStyle = 'rgba(233, 69, 96, 0.15)';
        ctx.fillRect(12, y - 10, width - 24, itemHeight - 5);
      }

      // Food name and quantity
      ctx.fillStyle = selected ? '#e94560' : '#e0e0e0';
      ctx.font = `${selected ? 'bold ' : ''}14px monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(
        `${selected ? '> ' : '  '}${food.name}`,
        16,
        y + 4,
      );
      ctx.textAlign = 'right';
      ctx.fillStyle = '#aaa';
      ctx.font = '12px monospace';
      ctx.fillText(`x${qty}`, width - 16, y + 4);

      // Effects preview
      ctx.textAlign = 'left';
      ctx.font = '11px monospace';
      const effectStr = food.effects
        .map((e) => `${e.stat.slice(0, 3)}${e.value > 0 ? '+' : ''}${e.value}`)
        .join(' ');
      ctx.fillStyle = '#888';
      ctx.fillText(effectStr, 32, y + 20);

      // Description
      ctx.fillStyle = '#666';
      ctx.font = '10px monospace';
      ctx.fillText(food.description.slice(0, 40), 32, y + 34);
    }

    // Scroll indicators
    if (this.scrollOffset > 0) {
      ctx.fillStyle = '#e94560';
      ctx.textAlign = 'center';
      ctx.font = '12px monospace';
      ctx.fillText('^ more ^', width / 2, itemStartY - 10);
    }
    if (this.scrollOffset + maxVisible < items.length) {
      ctx.fillStyle = '#e94560';
      ctx.textAlign = 'center';
      ctx.font = '12px monospace';
      ctx.fillText(
        'v more v',
        width / 2,
        itemStartY + maxVisible * itemHeight + 5,
      );
    }
  }

  private renderRecipes(
    ctx: CanvasRenderingContext2D,
    width: number,
    _height: number,
  ): void {
    const startY = 110;
    const recipes = this.getAvailableRecipeList();

    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Available Recipes', width / 2, startY);

    if (recipes.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '14px monospace';
      ctx.fillText(
        'Collect ingredients to unlock recipes!',
        width / 2,
        startY + 60,
      );
      return;
    }

    const itemStartY = startY + 30;
    const itemHeight = 80;

    recipes.forEach((recipe, idx) => {
      const y = itemStartY + idx * itemHeight;
      const selected = idx === this.selectedItem;

      if (selected) {
        ctx.fillStyle = 'rgba(233, 69, 96, 0.15)';
        ctx.fillRect(12, y - 10, width - 24, itemHeight - 5);
      }

      ctx.fillStyle = selected ? '#e94560' : '#e0e0e0';
      ctx.font = `${selected ? 'bold ' : ''}14px monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(`${selected ? '> ' : '  '}${recipe.name}`, 16, y + 4);

      if (recipe.craftCost > 0) {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffd700';
        ctx.font = '12px monospace';
        ctx.fillText(`Cost: ${recipe.craftCost}`, width - 16, y + 4);
      }

      // Ingredients
      ctx.textAlign = 'left';
      ctx.fillStyle = '#888';
      ctx.font = '11px monospace';
      ctx.fillText(
        `Needs: ${recipe.ingredients.join(', ')}`,
        32,
        y + 22,
      );

      // Bonus effects
      const bonusStr = recipe.bonusEffects
        .map((e) => `${e.stat.slice(0, 3)}+${e.value}`)
        .join(' ');
      ctx.fillStyle = '#4ecca3';
      ctx.font = '11px monospace';
      ctx.fillText(`Bonus: ${bonusStr}`, 32, y + 38);

      // Description
      ctx.fillStyle = '#666';
      ctx.font = '10px monospace';
      ctx.fillText(recipe.description.slice(0, 45), 32, y + 52);
    });
  }

  private renderFeedingAnimation(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    const { reaction, timer } = this.animation;
    const progress = 1 - timer / 1.5;

    // Pet character (bouncing during feed)
    const petY = height / 2 - 40 + Math.sin(progress * Math.PI * 4) * 15;
    ctx.fillStyle = '#e94560';
    ctx.beginPath();
    ctx.arc(width / 2, petY, 35, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(width / 2 - 10, petY - 8, 7, 0, Math.PI * 2);
    ctx.arc(width / 2 + 10, petY - 8, 7, 0, Math.PI * 2);
    ctx.fill();

    // Expression based on reaction
    ctx.fillStyle = '#1a1a2e';
    if (reaction === 'loved' || reaction === 'liked') {
      // Happy eyes (small)
      ctx.beginPath();
      ctx.arc(width / 2 - 9, petY - 7, 3, 0, Math.PI * 2);
      ctx.arc(width / 2 + 11, petY - 7, 3, 0, Math.PI * 2);
      ctx.fill();
      // Smile
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(width / 2, petY + 2, 10, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    } else if (reaction === 'disliked') {
      // Squinty eyes
      ctx.beginPath();
      ctx.arc(width / 2 - 9, petY - 7, 4, 0, Math.PI * 2);
      ctx.arc(width / 2 + 11, petY - 7, 4, 0, Math.PI * 2);
      ctx.fill();
      // Frown
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(width / 2, petY + 14, 8, 1.1 * Math.PI, 1.9 * Math.PI);
      ctx.stroke();
    } else if (reaction === 'overfed') {
      // Sick eyes (X shapes)
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 2;
      const drawX = (cx: number, cy: number, s: number) => {
        ctx.beginPath();
        ctx.moveTo(cx - s, cy - s);
        ctx.lineTo(cx + s, cy + s);
        ctx.moveTo(cx + s, cy - s);
        ctx.lineTo(cx - s, cy + s);
        ctx.stroke();
      };
      drawX(width / 2 - 9, petY - 7, 4);
      drawX(width / 2 + 11, petY - 7, 4);
      // Green tint
      ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
      ctx.beginPath();
      ctx.arc(width / 2, petY, 35, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Neutral
      ctx.beginPath();
      ctx.arc(width / 2 - 9, petY - 7, 3.5, 0, Math.PI * 2);
      ctx.arc(width / 2 + 11, petY - 7, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Reaction text
    const reactionText = this.getReactionText(reaction);
    const textAlpha = Math.min(1, progress * 3);
    const textY = petY - 60 - progress * 30;

    ctx.globalAlpha = textAlpha;
    ctx.fillStyle = this.getReactionColor(reaction);
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(reactionText, width / 2, textY);
    ctx.globalAlpha = 1;

    // Floating particles for loved reaction
    if (reaction === 'loved') {
      for (let i = 0; i < 5; i++) {
        const px =
          width / 2 + Math.cos(progress * Math.PI * 2 + i * 1.2) * (40 + i * 10);
        const py = petY - 20 - progress * 60 - i * 15;
        ctx.fillStyle = '#ff6b9d';
        ctx.font = '14px monospace';
        ctx.fillText('\u2665', px, py);
      }
    }
  }

  private getReactionText(reaction: FeedingReaction): string {
    switch (reaction) {
      case 'loved':
        return 'Loves it!';
      case 'liked':
        return 'Yummy!';
      case 'neutral':
        return 'Munch...';
      case 'disliked':
        return 'Yuck!';
      case 'overfed':
        return 'Too full!';
    }
  }

  private getReactionColor(reaction: FeedingReaction): string {
    switch (reaction) {
      case 'loved':
        return '#ff6b9d';
      case 'liked':
        return '#4ecca3';
      case 'neutral':
        return '#e0e0e0';
      case 'disliked':
        return '#ffa500';
      case 'overfed':
        return '#e94560';
    }
  }
}
