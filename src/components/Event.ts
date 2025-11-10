import { Component } from "../ecs/decorators/Component.ts";
import { IComponent } from "../ecs/interface/IComponent.ts";

export type IEventType =
    | "click" | "dblclick"
    | "mousedown" | "mouseup" | "mousemove" | "contextmenu" | "wheel"
    | "touchstart" | "touchmove" | "touchend" | "touchcancel"
    | "pointerdown" | "pointermove" | "pointerup" | "pointercancel";

export type IScreenEvent = MouseEvent | PointerEvent | WheelEvent | TouchEvent;
export type EventCallback = (event: IScreenEvent, entityId: number) => boolean | void;

@Component("Event")
export class EventComponent implements IComponent {
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
    emit(type: IEventType, event: IScreenEvent, entityId: number) {
        const arr = this.events.get(type);
        if (!arr) return false;

        let stop = false;
        for (const cb of arr) {
            const result = cb(event, entityId);
            if (result === true) stop = true;
        }
        return stop;
    }
}
