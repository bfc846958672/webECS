import { IComponent } from "../IComponent.ts";
import { RenderComponent } from "./RenderComponent.ts";

/**
 * 线组件（WebGL gl.LINES）
 * 便于快速绘制 1px 线段/折线
 */
export class Line extends RenderComponent implements IComponent {
  readonly type = "Line";

  /** 顶点列表，例如 [[0,0],[100,50]] */
  points: [number, number][] = [];

  /** 线条颜色 */
  strokeStyle: string;

  /** 透明度 */
  alpha: number;

  /** 是否参与渲染 */
  render: boolean = true;

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
