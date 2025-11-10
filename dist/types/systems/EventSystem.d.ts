import { ISystem } from '../ecs/System.ts';
/**
 * EventSystem：仅处理具有屏幕坐标的输入事件
 * 包含鼠标、触摸、指针、滚轮等
 */
export declare class EventSystem extends ISystem {
    protected onInit(): void;
    /** 初始化事件监听 */
    private initPointerEvents;
    /** 提取带坐标的事件类型 */
    private handleEvent;
    /** 冒泡事件分发 */
    private propagateEvent;
    update(): void;
}
