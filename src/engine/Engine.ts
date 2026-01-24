import { ECS } from "../ecs/ECS.ts";
import { Camera, Renderer } from "../webgl/index.ts";
import { Ticker } from "./Ticker.ts";
import { SceneNode } from "../scene/SceneTree.ts";
import { Root } from "../entity/root.ts";
import { SceneTreeRenderSystem } from "../system/systems/SceneTreeRenderSystem.ts";
import { PreLogSystem } from "../system/systems/PreLogSystem.ts";
import { PostLogSystem } from "../system/systems/PostLogSystem.ts";
import { PickEntitySystem } from "../system/systems/PickEntitySystem.ts";
import { IEngine, IEngineOption } from "./IEngine.ts";
import { BoxDebugSystem } from "../system/systems/BoxDebugSystem.ts";
import { EventSystem } from "../system/systems/EventSystem.ts";
import type { IRenderContext } from "../interface/IRender.ts";
import { bindEngineResize, resizeEngineToCanvas } from "./resize.ts";
import { PostRenderQueue, PreRenderQueue } from "../system/systems/RenderQueue.ts";
export class Engine implements IEngine {
    public boxDebug: boolean = false;
    
    public ecs: ECS;
    private ticker: Ticker;
    root!: SceneNode;
    public renderContext: IRenderContext
    constructor(canvas: HTMLCanvasElement, options: IEngineOption = { autoResize: true, performance: false }) {
        this.ecs = new ECS();
        this.ecs.canvas = canvas;
        // 场景树根节点
        this.root = Root.create(this);
        // webgl 相关
        this.renderContext = {
            camera: new Camera(undefined, {
                left: 0, top: 0,
                right: canvas.width,
                bottom: canvas.height,
                near: -1, far: 1,
            }),
            renderer: new Renderer({
                canvas, width: canvas.width,
                height: canvas.height, webgl: 2,
                dpr: window.devicePixelRatio || 1,
                alpha: false, depth: false,
                antialias: true,
                premultipliedAlpha: false,
            })
        };

        // 自动同步 canvas/CSS 尺寸变化到 renderer + camera
        if (options.autoResize) bindEngineResize(this);
        // 注册系统
        if (options.performance) this.ecs.addSystem(new PreLogSystem(this, this.root));
        this.ecs.addSystem(new PreRenderQueue(this, this.root));
        this.ecs.addSystem(new SceneTreeRenderSystem(this, this.root));
        this.ecs.addSystem(new BoxDebugSystem(this, this.root));
        this.ecs.addSystem(new PickEntitySystem(this, this.root));
        this.ecs.addSystem(new EventSystem(this, this.root));
        this.ecs.addSystem(new PostRenderQueue(this, this.root));
        if (options.performance) this.ecs.addSystem(new PostLogSystem(this, this.root));
        // 绑定 Ticker → ECS
        this.ticker = new Ticker();
        this.ticker.add((dt) => this.ecs.update(dt));
    }
    start() {
        this.ticker.start();
    }

    stop() {
        this.ticker.stop();
    }


    resize(size: { width: number, height: number }) {
        const that = this;
        this.ecs.getSystem(PreRenderQueue).once(() => { resizeEngineToCanvas(that, size); })
    }
}
