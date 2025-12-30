import type { ECS } from "../ecs/ECS.ts";
import type { ISystem } from "./System.ts";

/**
 * Render 策略接口：与 AABB 的 IBoundingBoxStrategy 相对应
 * 每种图形的具体渲染策略需要实现该接口
 */
export interface IRenderStrategy {
	/** 是否由该策略负责渲染该实体 */
	match(ecs: ECS, entityId: number): boolean;
	/** 执行渲染 */
	render(system: ISystem, entityId: number): void;
}
