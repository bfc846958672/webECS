// 文件：ecs/EngineEvent.ts

import { IEngine } from "./interface/IEngine.ts";

/**
 * 泛型事件系统（零 any 版本）
 * 支持类型安全的 on/off/emit 调用
 */
export class EngineEvent<
  // ✅ 改动：允许任意接口（不强制 Record<string, ...>）
  T extends { [K in keyof T]: (...args: never[]) => void } = IEngine
> {
  private listeners: {
    [K in keyof T]?: Set<T[K]>;
  } = {};

  /** 监听事件 */
  on<K extends keyof T>(event: K, callback: T[K]): void {
    (this.listeners[event] ??= new Set()).add(callback);
  }

  /** 取消监听 */
  off<K extends keyof T>(event: K, callback?: T[K]): void {
    if (callback) this.listeners[event]?.delete(callback);
    else delete this.listeners[event];
  }

  /** 触发事件 */
  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): void {
    const set = this.listeners[event];
    if (!set) return;
    for (const cb of set) cb(...args);
  }

  /** 清除监听器 */
  clear<K extends keyof T>(event?: K): void {
    if (event) delete this.listeners[event];
    else this.listeners = {};
  }
}
