import { Renderer } from './Renderer';

export interface Scene {
  readonly name: string;
  enter?(): void;
  exit?(): void;
  update(dt: number): void;
  render(renderer: Renderer): void;
}

export class SceneManager {
  private scenes = new Map<string, Scene>();
  private currentScene: Scene | null = null;

  register(scene: Scene): void {
    this.scenes.set(scene.name, scene);
  }

  switchTo(name: string): void {
    const next = this.scenes.get(name);
    if (!next) throw new Error(`Scene "${name}" not registered`);

    this.currentScene?.exit?.();
    this.currentScene = next;
    this.currentScene.enter?.();
  }

  get current(): Scene | null {
    return this.currentScene;
  }

  update(dt: number): void {
    this.currentScene?.update(dt);
  }

  render(renderer: Renderer): void {
    this.currentScene?.render(renderer);
  }
}
