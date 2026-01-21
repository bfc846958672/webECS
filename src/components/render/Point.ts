import { IComponent } from "../IComponent.ts";
import { RenderComponent } from "./RenderComponent.ts";

/**
 * 点块组件（WebGL gl.POINTS）
 * 便于后续粒子模块：每个实体一个点
 */
export class Point extends RenderComponent implements IComponent {
  readonly type = "Point";

  /** 是否参与渲染 */
  render: boolean = true;

  /** 点大小（像素） */
  size: number;

  /** 填充颜色 */
  fillStyle: string;

  /** 透明度 */
  alpha: number;

  constructor(
    {
      size = 4,
      fillStyle = "#000000",
      alpha = 1.0,
      render = true,
    }: Partial<Point> = {}
  ) {
    super();
    this.size = size;
    this.fillStyle = fillStyle;
    this.alpha = alpha;
    this.render = render;
  }
}
