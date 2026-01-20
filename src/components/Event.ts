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
export type IEngineEvent = {engineEvent: { entityId: number, path: number[] }}
export type IRawEvent = MouseEvent | PointerEvent | WheelEvent | TouchEvent;
export type IScreenEvent = IRawEvent & IEngineEvent;
export type EventCallback = (event: IScreenEvent) => boolean | void;

export class EventComponent extends Component implements IComponent {
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
    emit(type: IEventType, event: IScreenEvent) {
        const arr = this.events.get(type);
        if (!arr) return false;

        let stop = false;
        for (const cb of arr) {
            const result = cb(event);
            if (result === true) stop = true;
        }
        return stop;
    }
}
