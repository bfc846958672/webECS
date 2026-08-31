import { IComponent } from "../IComponent.ts";
import { RenderComponent } from "./RenderComponent.ts";

/**
 * 线组件
 */
export class Line extends RenderComponent implements IComponent {
  readonly type = "Line";
  /** 点列表 */
  points: number[] = [];
  /** 线条颜色 */
  strokeStyle: string;
  /** 透明度 */
  alpha: number;
  /** 是否参与渲染 */
  render: boolean = true;
  /** 斜接限制 */
  miterLimit: number = 10;
  /** 连接方式 */
  join: "miter" | "bevel" | "round" = "miter";
  /** 端点样式 */
  cap: "butt" | "round" | "square" = "butt";
  /** 对齐方式 */
  alignment: 0.5 | 0 | 1 | number = 0.5;
  /** 线条宽度 */
  width: number = 1;
  /** 是否闭合 */
  closed: boolean = false;
  constructor(
    {
      points = [],
      strokeStyle = "#000000",
      alpha = 1.0,
      render = true,
    }: Partial<Line> = {}
  ) {
    super();
    this.points = points;
    this.strokeStyle = strokeStyle;
    this.alpha = alpha;
    this.render = render;
  }
}
