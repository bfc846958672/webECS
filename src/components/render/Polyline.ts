import { IComponent } from "../IComponent.ts";
import { RenderComponent } from "./RenderComponent.ts";
import { Engine } from "../../engine/Engine.ts";

/**
 * 折线 / 多边形组件
 * 仅存储渲染数据，不包含绘制逻辑
 * 系统（RenderSystem）负责渲染
 */
export class Polyline extends RenderComponent implements IComponent {
  /** 顶点列表，例如 [{x:0, y:0}, {x:100, y:50}] */
  points: [number,number][] = [];

  /** 是否闭合成多边形 */
  closed: boolean = false;

  /** 填充样式（闭合时有效） */
  fillStyle?: string;

  /** 线条样式 */
  strokeStyle: string;

  /** 线宽 */
  lineWidth: number;

  /** 透明度 */
  alpha: number;

  lineJoin: "default" | "bevel" | "miter" | "round" = "miter";
  /** 是否参与渲染 */
  render: boolean = true;

  constructor(
    engine: Engine | null,
    {
      points = [],
      closed = false,
      fillStyle,
      strokeStyle = "#000000",
      lineWidth = 1,
      alpha = 1.0,
      render = true,
      lineJoin = "miter",
    }: Partial<Polyline> = {}
  ) {
    super(engine);
    this.points = points;
    this.closed = closed;
    this.fillStyle = fillStyle;
    this.strokeStyle = strokeStyle;
    this.lineWidth = lineWidth;
    this.alpha = alpha;
    this.render = render;
    this.lineJoin = lineJoin;
  }
}
