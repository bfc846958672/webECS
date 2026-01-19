import { IComponent } from "../IComponent.ts";
import { RenderComponent } from "./RenderComponent.ts";

/**
 * 矩形组件，仅存储渲染数据
 * 不包含绘制逻辑，系统负责渲染
 */
export class Rect extends RenderComponent implements IComponent {
  width: number;
  height: number;
  render: boolean = true;
  fillStyle: string;
  strokeStyle?: string;
  lineWidth: number;
  alpha: number;
  radius: number;
  constructor({
    width = 0,
    height = 0,
    fillStyle = "#181b1dff",
    strokeStyle,
    lineWidth = 0,
    alpha = 1.0,
    render = true,
    radius = 0,
  }: Partial<Rect> = {}) {
    super();
    this.width = width;
    this.height = height;
    this.fillStyle = fillStyle || "#181b1dff";
    this.strokeStyle = strokeStyle || "#181b1dff";
    this.lineWidth = lineWidth || 0;
    this.alpha = alpha || 1.0;
    this.radius = radius || 0;
    this.render = render;
  }
}
