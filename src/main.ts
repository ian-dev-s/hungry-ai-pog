import { GameLoop, Renderer, SceneManager } from '@engine/index';
import { TitleScene } from '@scenes/TitleScene';
import { GameScene } from '@scenes/GameScene';
import { MenuScene } from '@scenes/MenuScene';

const renderer = new Renderer('game-canvas', 480, 640);
const sceneManager = new SceneManager();

const titleScene = new TitleScene(() => sceneManager.switchTo('game'));
const gameScene = new GameScene(
  () => sceneManager.switchTo('menu'),
  () => sceneManager.switchTo('kitchen'),
);
const menuScene = new MenuScene(
  () => sceneManager.switchTo('game'),
  () => sceneManager.switchTo('title'),
);

sceneManager.register(titleScene);
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
