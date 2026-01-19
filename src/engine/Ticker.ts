import { set } from "../webgl/math/functions/Vec3Func";

export class Ticker {
  private lastTime = 0;
  private running = false;
  private callbacks: ((dt: number) => void)[] = [];

  constructor() {
    this.loop = this.loop.bind(this); // 绑定 this 上下文
  }

  add(callback: (dt: number) => void) {
    this.callbacks.push(callback);
  }

  remove(callback: (dt: number) => void) {
    const i = this.callbacks.indexOf(callback);
    if (i !== -1) this.callbacks.splice(i, 1);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    this.running = false;
  }

  private loop(now: number) {
    if (!this.running) return;
    const dt = (now - this.lastTime) / 1000; // 秒为单位
    // const fps = dt > 0 ? 1 / dt : 0;
    this.lastTime = now;
    for (const cb of this.callbacks) {
      cb(dt);
    }
    requestAnimationFrame(this.loop);
  }
}
