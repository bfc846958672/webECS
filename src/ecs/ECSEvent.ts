import type { IComponent, ComponentConstructor } from "./interface/IComponent.ts";

/** 定义 ECS 事件及其参数类型 */
export interface ECSEventMap {
  create_entity: [entityId: number];
  remove_entity: [entityId: number];
  add_component: [entityId: number, component: IComponent];
  remove_component: [entityId: number, componentClass: ComponentConstructor<IComponent>];
  // 可以增加自定义事件
  [key: string]: unknown[];
}

/** 事件监听器类型 */
type ECSEventListener<T extends unknown[]> = (...args: T) => void;

export class ECSEvent<Events extends ECSEventMap = ECSEventMap> {
  private listeners: {
    [K in keyof Events]?: Set<ECSEventListener<Events[K]>>;
  } = {};

  /** 注册事件监听 */
  on<K extends keyof Events>(event: K, listener: ECSEventListener<Events[K]>): void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event]!.add(listener);
  }

  /** 注销事件监听 */
  off<K extends keyof Events>(event: K, listener?: ECSEventListener<Events[K]>): void {
    const set = this.listeners[event];
    if (!set) return;

    if (listener) {
      set.delete(listener);
    } else {
      delete this.listeners[event];
    }
  }

  /** 触发事件 */
  emit<K extends keyof Events>(event: K, ...args: Events[K]): void {
    const set = this.listeners[event];
    if (!set) return;

    for (const fn of set) {
      fn(...args);
    }
  }

  /** 清空所有事件监听 */
  clear(): void {
    for (const key in this.listeners) {
      delete this.listeners[key];
    }
  }
}
