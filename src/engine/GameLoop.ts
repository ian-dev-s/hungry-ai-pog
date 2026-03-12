export type UpdateFn = (dt: number) => void;
export type RenderFn = () => void;

export class GameLoop {
  private rafId = 0;
  private lastTime = 0;
  private running = false;
  private readonly maxDt = 1 / 20; // cap at 50ms to avoid spiral of death

  constructor(
    private onUpdate: UpdateFn,
    private onRender: RenderFn,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame((t) => this.tick(t));
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick(now: number): void {
    if (!this.running) return;

    const dt = Math.min((now - this.lastTime) / 1000, this.maxDt);
    this.lastTime = now;

    this.onUpdate(dt);
    this.onRender();

    this.rafId = requestAnimationFrame((t) => this.tick(t));
  }
}
