import type { ECS } from "../ecs/ECS.ts";
import type { IShareContext } from "./System.ts";
import type { ISystem } from "../systems/System.ts";
export interface IProcess<TContext = IShareContext, TParentContext = IShareContext> {
    match: (ecs: ECS, entityId: number) => boolean;
    /** 判断该渲染器是否能处理此实体 */
    /** 渲染该实体 */
    exec: (system: ISystem, entityId: number, parentEntityId: number | null, context: TContext, parentContext: TParentContext | null) => void;
}

