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
      this.loop(performance.now());
  }

stop() {
    this.running = false;
  }

  private loop(now: number) {
    if (!this.running) return;
    const dt = (now - this.lastTime) / 1000; // 秒为单位
    this.lastTime = now;

    for (const cb of this.callbacks) {
      cb(dt);
    }
    // 递归调用，实现循环,暂时不使用 requestAnimationFrame
    // requestAnimationFrame(this.loop);

  }
}
