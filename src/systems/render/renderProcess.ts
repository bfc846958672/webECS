import { ECS } from "../../ecs/ECS.ts";
import type { ISystem, IProcess } from "../../interface/System.ts";
import type { IRenderStrategy } from "../../interface/IRender.ts";
import { CircleRenderer } from "./CircleRenderer.ts";
import { RectRenderer } from "./RectRenderer.ts";
import { ImageRenderer } from "./ImageRenderer.ts";
import { PolylineRenderer } from "./PolylineRenderer.ts";
import { CurveRenderer } from "./CurveRenderer.ts";
import { PathRenderer } from "./PathRenderer.ts";
import type { IShareContext } from "../../interface/System.ts";

/**
 * 统一渲染进程：根据具体策略渲染图形
 * 与 AABB 的 BoundingBoxProcess 类似
 */
export class RenderProcess implements IProcess<IShareContext, IShareContext> {
  match(_ecs: ECS, _entityId: number) {
    return true;
  }

  private strategies: IRenderStrategy[] = [];

  constructor() {
    this.strategies.push(new CircleRenderer());
    this.strategies.push(new RectRenderer());
    this.strategies.push(new ImageRenderer());
    this.strategies.push(new PolylineRenderer());
    this.strategies.push(new CurveRenderer());
    this.strategies.push(new PathRenderer());
  }

  private renderWithStrategy(system: ISystem, entityId: number) {
    for (const s of this.strategies) {
      if (s.match(system.ecs, entityId)) {
        s.render(system, entityId);
        return;
      }
    }
  }

  exec(system: ISystem, entityId: number): void {
    this.renderWithStrategy(system, entityId);
  }
}
