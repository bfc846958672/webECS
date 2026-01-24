import { ECS } from "../../ecs/ECS.ts";
import type { ISystem, IProcess } from "../../interface/System.ts";
import type { IRenderStrategy } from "../../interface/IRender.ts";
import { CircleGraphics } from "../graphics/CircleGraphics.ts";
import { RectGraphics } from "../graphics/RectGraphics.ts";
import { ImageGraphics } from "../graphics/ImageGraphics.ts";
import { PolylineGraphics } from "../graphics/PolylineGraphics.ts";
import { CurveGraphics } from "../graphics/CurveGraphics.ts";
import { PathGraphics } from "../graphics/PathGraphics.ts";
import { TextGraphics } from "../graphics/TextGraphics.ts";
import { PointGraphics } from "../graphics/PointGraphics.ts";
import { LineGraphics } from "../graphics/LineGraphics.ts";
import type { IShareContext } from "../../interface/System.ts";
import type { IRenderContext } from "../../interface/IRender.ts";
import { SceneNode } from "../../scene/SceneTree.ts";
/**
 * 统一渲染进程：根据具体策略渲染图形
 * 与 AABB 的 BoundingBoxProcess 类似
 */
export class RenderProcess implements IProcess<IShareContext, IShareContext> {

  match(_ecs: ECS, _entityId: SceneNode): boolean {
    return true;
  }
  private strategies: IRenderStrategy[] = [];

  constructor(public renderContext: IRenderContext) {
    this.strategies.push(new CircleGraphics(this.renderContext));
    this.strategies.push(new RectGraphics(this.renderContext));
    this.strategies.push(new ImageGraphics(this.renderContext));
    this.strategies.push(new TextGraphics(this.renderContext));
    this.strategies.push(new PointGraphics(this.renderContext));
    this.strategies.push(new LineGraphics(this.renderContext));
    this.strategies.push(new PolylineGraphics(this.renderContext));
    this.strategies.push(new CurveGraphics(this.renderContext));
    this.strategies.push(new PathGraphics(this.renderContext));
  }

  private renderWithStrategy(system: ISystem, entityId: number) {
    for (const s of this.strategies) {
      if (s.match(system.ecs, entityId)) {
        s.render(system, entityId);
        return;
      }
    }
  }

  exec(system: ISystem, node: SceneNode): void {
    this.renderWithStrategy(system, node.entityId);
  }
}
