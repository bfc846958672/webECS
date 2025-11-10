import { IComponent } from '../ecs/interface/IComponent.ts';
export type IEventType = "click" | "dblclick" | "mousedown" | "mouseup" | "mousemove" | "contextmenu" | "wheel" | "touchstart" | "touchmove" | "touchend" | "touchcancel" | "pointerdown" | "pointermove" | "pointerup" | "pointercancel";
export type IScreenEvent = MouseEvent | PointerEvent | WheelEvent | TouchEvent;
export type EventCallback = (event: IScreenEvent, entityId: number) => boolean | void;
export declare class EventComponent implements IComponent {
    events: Map<IEventType, EventCallback[]>;
    /** 注册事件 */
    on(type: IEventType, callback: EventCallback): void;
    /** 移除事件 */
    off(type: IEventType, callback?: EventCallback): void;
    /** 触发事件，返回 true 表示阻止冒泡 */
    emit(type: IEventType, event: IScreenEvent, entityId: number): boolean;
}
