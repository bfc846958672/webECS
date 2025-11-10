import { IComponent } from "./interface/IComponent.ts";

/**
 * Archetype：管理一组固定组件组合的实体集合
 * 只负责列式存储和实体的增删
 */
export class Archetype {
  /** 实体ID数组 */
  public entities: number[] = [];

  /** 组件类型集合（固定） */
  public componentTypes: Set<Function>;

  /** 列式存储：组件类型 -> 对应组件实例数组 */
  public columns: Map<Function, IComponent[]> = new Map();

  constructor(componentTypes: Set<Function>) {
    this.componentTypes = componentTypes;
    for (const c of componentTypes) {
      this.columns.set(c, []);
    }
  }

  /**
   * 添加实体及对应组件实例
   * @param entityId 实体ID
   * @param components Map<组件类, 组件实例>，必须包含该 Archetype 的所有组件
   */
  add(entityId: number, components: Map<Function, IComponent>) {
    this.entities.push(entityId);
    for (const c of this.componentTypes) {
      const col = this.columns.get(c)!;
      const comp = components.get(c);
      if (!comp) {
        throw new Error(`Missing component ${c.name} for entity ${entityId}`);
      }
      col.push(comp);
    }
  }

  /**
   * 从 Archetype 移除实体及对应组件实例
   */
  remove(entityId: number) {
    const index = this.entities.indexOf(entityId);
    if (index === -1) return;

    this.entities.splice(index, 1);
    for (const col of this.columns.values()) {
      col.splice(index, 1); // 保持列对齐
    }
  }

  /**
   * 判断 Archetype 是否包含指定组件集合（子集匹配）
   */
  matches(queryComponents: Function[]): boolean {
    return queryComponents.every(c => this.componentTypes.has(c));
  }

  /**
   * 获取实体对应组件实例
   */
  getComponent<T extends IComponent>(entityId: number, componentClass: Function): T | undefined {
    const index = this.entities.indexOf(entityId);
    if (index === -1) return undefined;
    const col = this.columns.get(componentClass);
    return col ? (col[index] as T) : undefined;
  }
}
