import 'reflect-metadata';
import { ComponentRegistry } from '../registry/ComponentRegistry.ts';
export function Component(name: string) {
  return function (ctor: Function) {
    // 绑定元数据（方便 ECS 或调试工具读取）
    Reflect.defineMetadata("component:name", name, ctor);
    // 自动注册到全局组件注册表
    ComponentRegistry.set(name, ctor);
  };
}

