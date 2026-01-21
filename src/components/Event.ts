import { Component } from "./Component.ts";
import { IComponent } from "./IComponent.ts";

export type IEventType =
    | "click" | "dblclick"
    | "mousedown" | "mouseup" | "mousemove" | "contextmenu" | "wheel"
    | "touchstart" | "touchmove" | "touchend" | "touchcancel"
    | "pointerdown" | "pointermove" | "pointerup" | "pointercancel";

/**
 * engine事件, 会合原始event 合并到一起
 */
export type IEngineEvent = { entityId: number, path: number[] }
export type IScreenEvent = MouseEvent | PointerEvent | WheelEvent | TouchEvent;
export type EventCallback = (event: IScreenEvent, engineEvent: IEngineEvent) => boolean | void;

export class EventComponent extends Component implements IComponent {
    readonly type = "Event";
    public events = new Map<IEventType, EventCallback[]>();

    /** 注册事件 */
    on(type: IEventType, callback: EventCallback) {
        if (!this.events.has(type)) this.events.set(type, []);
        this.events.get(type)!.push(callback);
    }

    /** 移除事件 */
    off(type: IEventType, callback?: EventCallback) {
        if (!callback) {
            this.events.delete(type);
        } else {
            const arr = this.events.get(type);
            if (!arr) return;
            this.events.set(type, arr.filter(cb => cb !== callback));
        }
    }

    /** 触发事件，返回 true 表示阻止冒泡 */
    emit(type: IEventType, event: IScreenEvent, engineEvent: IEngineEvent): boolean {
        const arr = this.events.get(type);
        if (!arr) return false;

        let stop = false;
        for (const cb of arr) {
            const result = cb(event, engineEvent);
            if (result === true) stop = true;
        }
        return stop;
    }
}
