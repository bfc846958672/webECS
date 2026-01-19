import { IComponent } from "../IComponent.ts";
import { Component } from "../Component.ts";
/**
 * 渲染组件，保证实体仅有一个渲染组件
 */
export class RenderComponent extends Component implements IComponent {
  constructor({ }: Partial<RenderComponent> = {}) {
    super();
  }
}
