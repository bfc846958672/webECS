import { ISystem } from "../../interface/System.ts";
import { SceneNode } from "../../scene/SceneTree.ts";
import { Engine } from "../../engine/Engine.ts";

export class RenderQueue extends ISystem {
    private callbacks: Map<() => void, boolean> = new Map();

    constructor(public engine: Engine, public sceneTree: SceneNode) {
        super(engine, sceneTree);
    }

    on(callback: () => void): void {
        this.callbacks.set(callback, false);
    }

    once(callback: () => void): void {
        this.callbacks.set(callback, true);
    }

    off(callback: () => void): void {
        this.callbacks.delete(callback);
    }

    update(): void {
        const toRemove: (() => void)[] = [];
        this.callbacks.forEach((isOnce, cb) => {
            cb();
            if (isOnce) toRemove.push(cb);
        });
        toRemove.forEach(cb => this.callbacks.delete(cb));
    }
}
/**
 * 渲染队列系统， PreRender两个阶段
 */
export class PreRenderQueue extends RenderQueue {}
/**
 * 渲染队列系统， PostRender 阶段
 */
export class PostRenderQueue extends RenderQueue {}