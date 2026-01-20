import { ISystem } from "../../interface/System.ts";
import { EventComponent, IEngineEvent, IEventType, IScreenEvent } from "../../components/Event.ts";
import { SceneNode } from "../../scene/SceneTree.ts";
import { PickEntitySystem } from "./PickEntitySystem.ts";
/**
 * EventSystem：仅处理具有屏幕坐标的输入事件
 * 包含鼠标、触摸、指针、滚轮等
 */
export class EventSystem extends ISystem {
    protected onInit(): void {
        this.initPointerEvents();
    }

    /** 初始化事件监听 */
    private initPointerEvents() {
        const canvas = (this.ecs as any).canvas as HTMLCanvasElement;
        if (!canvas) throw new Error("ECS.canvas 未设置");

        const eventTypes: IEventType[] = [
            // 鼠标事件
            "click",
            "dblclick",
            "mousedown",
            "mouseup",
            "mousemove",
            "contextmenu",
            "wheel",

            // 触摸事件
            "touchstart",
            "touchmove",
            "touchend",
            "touchcancel",

            // 指针事件
            "pointerdown",
            "pointermove",
            "pointerup",
            "pointercancel",
        ];

        for (const type of eventTypes) {
            canvas.addEventListener(type, (e) => this.handleEvent(e as IScreenEvent, type));
        }
    }

    /** 提取带坐标的事件类型 */
    private handleEvent(e: IScreenEvent, type: IEventType) {
        const canvas = (this.ecs as any).canvas as HTMLCanvasElement;
        const rect = canvas.getBoundingClientRect();

        // 计算坐标
        let x = 0, y = 0;

        if ("clientX" in e && "clientY" in e) {
            // 鼠标、指针、滚轮事件
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        } else if ("touches" in e && e.touches.length > 0) {
            // 触摸事件
            const t = e.touches[0];
            x = t.clientX - rect.left;
            y = t.clientY - rect.top;
        }

        // 命中检测
        const entityId = this.ecs.getSystem(PickEntitySystem).pickEntityAt(x, y);
        if (entityId == null) return;

        this.propagateEvent(entityId, type, e);
    }

    /** 冒泡事件分发 */
    private propagateEvent(entityId: number, type: IEventType, e: IScreenEvent) {
        let node: SceneNode | null = this.sceneTree.get(entityId);
        let path:number[] = []
        while (node) {
            const ev = this.ecs.getComponent(node.entityId, EventComponent);
            if (ev) {
                const engineEvent: IEngineEvent = { engineEvent: { entityId: node.entityId, path: [...path] } };
                const stop = ev.emit(type, { ...e, ...engineEvent });
                if (stop) break; // 阻止冒泡
            }
            path.push(node.entityId);
            node = node.parent;
        }
    }

    update(): void {}
}
