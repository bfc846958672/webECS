import { ECS } from "../ecs/ECS";

export interface IAABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
export interface IBoundingBoxStrategy {
  match(ecs: ECS, entityId: number): boolean;
  computeAABB(ecs: ECS, entityId: number): IAABB;
  hit(ecs: ECS, entityId: number, x: number, y: number): boolean;
}
