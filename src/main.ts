import { GameLoop, Renderer, SceneManager } from '@engine/index';
import { TitleScene } from '@scenes/TitleScene';
import { GameScene } from '@scenes/GameScene';
import { MenuScene } from '@scenes/MenuScene';
import { EggSelectionScene } from '@scenes/EggSelectionScene';
import { EggNurturingScene } from '@scenes/EggNurturingScene';
import { EggHatchingSystem } from '@systems/EggHatchingSystem';
import { SaveManager } from '@systems/SaveManager';

const renderer = new Renderer('game-canvas', 480, 640);
const sceneManager = new SceneManager();
const saveManager = new SaveManager();
const eggSystem = new EggHatchingSystem();

// Load existing save if present
saveManager.load();

// Restore in-progress egg from save
const savedEgg = saveManager.getEgg();
if (savedEgg && !savedEgg.hatched) {
  eggSystem.loadState(savedEgg);
}

// Auto-save egg state on every interaction
eggSystem.on((_type, eggState) => {
  saveManager.updateEgg(eggState);
});

const titleScene = new TitleScene(() => {
  const state = saveManager.getState();
  if (state.pet) {
    // Existing pet — go straight to game
    gameScene.setPet(state.pet);
    sceneManager.switchTo('game');
  } else if (eggSystem.hasActiveEgg()) {
    // In-progress egg — resume nurturing
    sceneManager.switchTo('eggNurturing');
  } else {
    // New game — select an egg
    sceneManager.switchTo('eggSelection');
  }
});

const eggSelectionScene = new EggSelectionScene(
  (element) => {
    eggSystem.selectEgg(element);
    sceneManager.switchTo('eggNurturing');
  },
  () => sceneManager.switchTo('title'),
);

const eggNurturingScene = new EggNurturingScene(
  eggSystem,
  () => {
    const pet = eggSystem.hatch('Pet');
    if (pet) {
      saveManager.update({ pet });
      saveManager.updateEgg(null);
      gameScene.setPet(pet);
      sceneManager.switchTo('game');
    }
  },
  () => sceneManager.switchTo('title'),
);

const gameScene = new GameScene(
  () => sceneManager.switchTo('menu'),
  () => sceneManager.switchTo('kitchen'),
);
const menuScene = new MenuScene(
  () => sceneManager.switchTo('game'),
  () => sceneManager.switchTo('title'),
);

sceneManager.register(titleScene);
sceneManager.register(eggSelectionScene);
sceneManager.register(eggNurturingScene);
sceneManager.register(gameScene);
sceneManager.register(menuScene);
sceneManager.switchTo('title');

const loop = new GameLoop(
  (dt) => sceneManager.update(dt),
  () => {
    renderer.clear();
    sceneManager.render(renderer);
  },
);

loop.start();

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed - app still works without it
    });
  });
}
