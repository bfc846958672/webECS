import { ISystem } from "../../interface/System.ts";
import { SceneTree } from "../../scene/SceneTree.ts";
import { Engine } from "../../engine/Engine.ts";
import { PreLogSystem } from "./PreLogSystem.ts";

/**
 * 后置统计系统：读取 `PreLogSystem` 的打点并把计算结果写回到 `PreLogSystem.lastMeasureMs`，
 * 同时负责性能面板的 DOM 渲染与更新（固定在右上角）。
 */
export class PostLogSystem extends ISystem {
  private container!: HTMLDivElement;
  private lastDomUpdate = 0;
  private updateInterval = 200; // ms
  private frameTimes: number[] = [];
  private maxSamples = 60;

  constructor(public engine: Engine, public sceneTree: SceneTree) {
    super(engine, sceneTree);
  }

  protected onInit(): void {
    if (typeof document === 'undefined') return;
    this.createDom();
  }

  private createDom() {
    const d = document.createElement('div');
    Object.assign(d.style, {
      position: 'fixed',
      top: '8px',
      right: '8px',
      zIndex: '9999',
      background: 'rgba(0,0,0,0.65)',
      color: '#fff',
      padding: '8px 10px',
      borderRadius: '6px',
      fontFamily: 'monospace, system-ui, Arial',
      fontSize: '12px',
      lineHeight: '1.3',
      pointerEvents: 'none',
      minWidth: '120px',
    } as Partial<CSSStyleDeclaration>);

    d.innerHTML = [
      `<div id="webe-cpu-fps">FPS: -</div>`,
      `<div id="webe-draw">Draw: -</div>`,
      `<div id="webe-ms">MS: -</div>`,
      `<div id="webe-nodes">SceneNodes: -</div>`,
      `<div id="webe-canvas">Canvas: -</div>`,
    ].join("");

    document.body.appendChild(d);
    this.container = d;
  }

  update(delta: number): void {
    const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();

    // 读取前置打点并计算 draw 耗时
    const pre = this.ecs.getSystem(PreLogSystem) as PreLogSystem | undefined;
    if (pre) {
      const start = pre.timingMarks.get('frame-start');
      if (typeof start === 'number') {
        const drawMs = now - start;
        pre.lastMeasureMs = drawMs;
      }
    }

    // 使用传入的 delta（秒）计算 avg MS / FPS
    const ms = (typeof delta === 'number') ? delta * 1000 : 0;
    this.frameTimes.push(ms);
    if (this.frameTimes.length > this.maxSamples) this.frameTimes.shift();

    if (now - this.lastDomUpdate < this.updateInterval) return;
    this.lastDomUpdate = now;

    const avgMs = this.frameTimes.reduce((s, v) => s + v, 0) / this.frameTimes.length || 0;
    const fps = avgMs > 0 ? Math.round(1000 / avgMs) : 0;

    const nodesCount = this.sceneTree.displayList ? this.sceneTree.displayList.length : 0;

    const renderer = this.engine.renderContext.renderer as any;
    const gl = renderer.gl as WebGLRenderingContext | WebGL2RenderingContext;
    const canvas = gl && 'canvas' in gl ? (gl.canvas as HTMLCanvasElement) : undefined;
    const canvasSize = canvas ? `${(canvas.width / (renderer.dpr || 1))}x${(canvas.height / (renderer.dpr || 1))} @${renderer.dpr}dpr` : 'N/A';

    const elFPS = this.container.querySelector('#webe-cpu-fps') as HTMLElement | null;
    const elDraw = this.container.querySelector('#webe-draw') as HTMLElement | null;
    const elMS = this.container.querySelector('#webe-ms') as HTMLElement | null;
    const elNodes = this.container.querySelector('#webe-nodes') as HTMLElement | null;
    const elCanvas = this.container.querySelector('#webe-canvas') as HTMLElement | null;

    if (elFPS) elFPS.textContent = `FPS: ${fps}`;
    if (elMS) elMS.textContent = `MS: ${avgMs.toFixed(1)}`;
    const drawMs = pre && typeof pre.lastMeasureMs === 'number' ? pre.lastMeasureMs : NaN;
    if (elDraw) elDraw.textContent = isFinite(drawMs) ? `Draw: ${drawMs.toFixed(1)} ms` : `Draw: -`;
    if (elNodes) elNodes.textContent = `SceneNodes: ${nodesCount}`;
    if (elCanvas) elCanvas.textContent = `Canvas: ${canvasSize}`;

    if (elFPS) elFPS.style.color = fps < 30 ? '#ff5555' : fps < 50 ? '#ffd24d' : '#9eff9e';
  }
}
