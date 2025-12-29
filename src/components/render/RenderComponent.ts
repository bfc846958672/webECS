import { IComponent } from "../IComponent.ts";
import { Engine } from "../../engine/Engine.ts";
import { Component } from "../Component.ts";
/**
 * 渲染组件，保证实体仅有一个渲染组件
 */
export class RenderComponent extends Component implements IComponent {
  #engine: Engine | null;
  constructor(engine: Engine | null, { }: Partial<RenderComponent> = {}) {
    super();
    this.#engine = engine;
    this.#engine;
  }
}

