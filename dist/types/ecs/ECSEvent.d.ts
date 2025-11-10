import { IComponent, ComponentConstructor } from './interface/IComponent.ts';
/** 定义 ECS 事件及其参数类型 */
export interface ECSEventMap {
    create_entity: [entityId: number];
    remove_entity: [entityId: number];
    add_component: [entityId: number, component: IComponent];
    remove_component: [entityId: number, componentClass: ComponentConstructor<IComponent>];
    [key: string]: unknown[];
}
/** 事件监听器类型 */
type ECSEventListener<T extends unknown[]> = (...args: T) => void;
export declare class ECSEvent<Events extends ECSEventMap = ECSEventMap> {
    private listeners;
    /** 注册事件监听 */
    on<K extends keyof Events>(event: K, listener: ECSEventListener<Events[K]>): void;
    /** 注销事件监听 */
    off<K extends keyof Events>(event: K, listener?: ECSEventListener<Events[K]>): void;
    /** 触发事件 */
    emit<K extends keyof Events>(event: K, ...args: Events[K]): void;
    /** 清空所有事件监听 */
    clear(): void;
}
export {};
