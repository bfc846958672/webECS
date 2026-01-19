import { Camera, Renderer } from "../webgl/index.ts";
import type { Engine } from "./Engine.ts";
import {PreRenderQueue} from "../system/systems/RenderQueue.ts";
export type EngineResizeOptions = {
    /** 默认使用 engine.ecs.canvas */
    canvas?: HTMLCanvasElement;
    /** 默认 window.devicePixelRatio || 1 */
    dpr?: number;
};

export type EngineResizeController = {
    /** 立即触发一次同步尺寸 */
    resize: (size: {width: number, height: number}) => void;
    /** 解绑监听 */
    dispose: () => void;
};

function getCanvasCssSize(canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, (rect.width));
    const height = Math.max(1, (rect.height));
    return { width, height };
}

/**
 * 根据 canvas 的 CSS 尺寸同步：
 * - renderer.setSize(width, height)
 * - camera 的正交投影视口(left/right/top/bottom)
 */
export function resizeEngineToCanvas(engine: Engine, size: {width: number, height: number}) {
    const canvas = (engine.ecs as any).canvas as HTMLCanvasElement;
    if (!canvas) throw new Error("Engine.ecs.canvas 未设置");

    const { width, height } = size;
    const dpr = window.devicePixelRatio || 1;

    const renderer = engine.renderContext.renderer;
    const camera = engine.renderContext.camera;
    if (typeof renderer.dpr === "number") renderer.dpr = dpr;
    renderer.setSize(width, height);
    // viewport 必须使用绘图缓冲区像素（gl.canvas.width/height，已包含 dpr）
    // 否则在高 DPR 或 resize 过程中会出现裁剪/黑屏/只渲染一角等问题。
    renderer.setViewport(width * dpr, height * dpr);
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
export function bindEngineResize(engine: Engine): EngineResizeController {
    const canvas = (engine.ecs as any).canvas as HTMLCanvasElement;
    if (!canvas) throw new Error("Engine.ecs.canvas 未设置");

    let ro: ResizeObserver | null = new ResizeObserver(() => {
        const { width, height } = getCanvasCssSize(canvas);
        engine.ecs.getSystem(PreRenderQueue).once(() => { resizeEngineToCanvas(engine, {width, height})});
    });
    ro.observe(canvas);
    return {
        resize: (size: {width: number, height: number}) =>{ resizeEngineToCanvas(engine, size)},
        dispose: () => {
            if (ro) ro.disconnect();
            ro = null;
        },
    };
}
