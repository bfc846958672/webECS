import type { ECS } from "../ecs/ECS.ts";
import type { ISystem } from "./System.ts";
import { Camera,Renderer } from "../webgl/index.ts";
import type { IBoundingBoxStrategy } from "./AABB.ts";
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

/**
 * 渲染器上下文接口
 */
export interface IRenderContext {
	camera: Camera;
	renderer: Renderer
}



/**
 * 渲染图形基类
 */
export abstract class Graphics implements IRenderStrategy, IBoundingBoxStrategy {
	abstract match(ecs: ECS, entityId: number): boolean;
	abstract render(system: ISystem, entityId: number): void;
	abstract computeAABB(ecs: ECS, entityId: number): { minX: number; minY: number; maxX: number; maxY: number };
	abstract hit(ecs: ECS, entityId: number, x: number, y: number): boolean;
	constructor(public renderContext?: IRenderContext) {}
}