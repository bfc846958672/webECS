import { Camera, Renderer } from "../webgl/index.ts";
import type { Engine } from "./Engine.ts";

export type EngineResizeOptions = {
    /** 默认使用 engine.ecs.canvas */
    canvas?: HTMLCanvasElement;
    /** 默认 window.devicePixelRatio || 1 */
    dpr?: number;
};

export type EngineResizeController = {
    /** 立即触发一次同步尺寸 */
    resize: () => void;
    /** 解绑监听 */
    dispose: () => void;
};

function getCanvasCssSize(canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    return { width, height };
}

/**
 * 根据 canvas 的 CSS 尺寸同步：
 * - renderer.setSize(width, height)
 * - camera 的正交投影视口(left/right/top/bottom)
 */
export function resizeEngineToCanvas(engine: Engine, options: EngineResizeOptions = {}) {
    const canvas = options.canvas ?? ((engine.ecs as any).canvas as HTMLCanvasElement);
    if (!canvas) throw new Error("Engine.ecs.canvas 未设置");

    const { width: _width, height: _height } = getCanvasCssSize(canvas);
    const dpr = window.devicePixelRatio || 1;
    const width = _width * dpr;
    const height = _height * dpr;

    const renderer = engine.renderContext.renderer;
    const camera = engine.renderContext.camera;
    if (typeof renderer.dpr === "number") renderer.dpr = dpr;
    renderer.setSize(width, height);
    renderer.setViewport(width, height);
    // 更新 camera 正交参数
    camera.left = 0;
    camera.right = width;
    camera.top = 0;
    camera.bottom = height;
    camera.orthographic();
}

/**
 * 监听 canvas 大小变化并自动调用 resizeEngineToCanvas。
 * 适用于 CSS 控制 canvas 尺寸（如 100vw/100vh）时的动态自适应。
 */
export function bindEngineResize(engine: Engine, options: EngineResizeOptions = {}): EngineResizeController {
    const canvas = options.canvas ?? ((engine.ecs as any).canvas as HTMLCanvasElement);
    if (!canvas) throw new Error("Engine.ecs.canvas 未设置");

    let rafId: number | null = null;
    const schedule = () => {
        resizeEngineToCanvas(engine, options);
    };

    let ro: ResizeObserver | null = new ResizeObserver(() => schedule());
    ro.observe(canvas);

    // 初次同步
    resizeEngineToCanvas(engine, options);

    return {
        resize: () => resizeEngineToCanvas(engine, options),
        dispose: () => {
            if (rafId != null) cancelAnimationFrame(rafId);
            rafId = null;
            if (ro) ro.disconnect();
            ro = null;
        },
    };
}
