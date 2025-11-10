import { IComponent } from "../../ecs/interface/IComponent";
import { Engine } from "../../ecs/Engine.ts";
/**
 * 渲染组件，保证实体仅有一个渲染组件
 */
export class RenderComponent implements IComponent {
  #engine: Engine | null;
  constructor(engine: Engine | null, { }: Partial<RenderComponent> = {}) {
    this.#engine = engine;
    this.#engine;
  }
}

