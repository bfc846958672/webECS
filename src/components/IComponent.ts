// src/ecs/IComponent.ts
export interface IComponent {
  // 空接口，仅作标记，所有组件必须实现
}

export type ComponentConstructor<T extends IComponent> = new (props?: Partial<T>) => T;
