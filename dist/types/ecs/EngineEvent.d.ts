import { IEngine } from './interface/IEngine.ts';
/**
 * 泛型事件系统（零 any 版本）
 * 支持类型安全的 on/off/emit 调用
 */
export declare class EngineEvent<T extends {
    [K in keyof T]: (...args: never[]) => void;
} = IEngine> {
    private listeners;
    /** 监听事件 */
    on<K extends keyof T>(event: K, callback: T[K]): void;
    /** 取消监听 */
    off<K extends keyof T>(event: K, callback?: T[K]): void;
    /** 触发事件 */
    emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): void;
    /** 清除监听器 */
    clear<K extends keyof T>(event?: K): void;
}
