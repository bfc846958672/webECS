import { IComponent } from "../IComponent.ts";
import { RenderComponent } from "./RenderComponent.ts";
import { Engine } from "../../engine/Engine.ts";

/**
 * Circle（兼容椭圆与圆弧）
 * 若 radiusY 与 radius 相同，则为圆形；否则为椭圆。
 * 可通过 startAngle、endAngle 和 clockwise 绘制圆弧。
 */
export class Circle extends RenderComponent implements IComponent {
  render = true;

  /** 主半径（x 方向） */
  radius: number;
  /** 次半径（y 方向，默认为 radius） */
  radiusY!: number;
  /** 填充颜色 */
  fillStyle: string;
  /** 描边颜色 */
  strokeStyle?: string;
  /** 描边宽度 */
  lineWidth: number;
  /** 透明度 */
  alpha: number;
  /** 椭圆旋转角度（弧度） */
  rotation: number;

  /** 圆弧起始角度（弧度，0 = 3点钟方向） */
  startAngle: number;
  /** 圆弧结束角度（弧度） */
  endAngle: number;
  /** 是否顺时针绘制圆弧（默认为 true） */
  clockwise: boolean;

  constructor(
    engine: Engine | null,
    {
      radius = 10,
      radiusY, // 可选，不传时自动与 radius 相等
      fillStyle = "#e74c3c",
      strokeStyle,
      lineWidth = 0,
      alpha = 1.0,
      rotation = 0,
      render = true,
      startAngle = 0,
      endAngle = Math.PI * 2,
      clockwise = true,
    }: Partial<Circle> = {}
  ) {
    super(engine);
    this.radius = radius;
    if (radiusY) this.radiusY = radiusY; // 默认与 radius 相等（圆形）
    this.fillStyle = fillStyle;
    this.strokeStyle = strokeStyle ?? "#c0392b";
    this.lineWidth = lineWidth;
    this.alpha = alpha;
    this.rotation = rotation;
    this.render = render;
    this.startAngle = startAngle;
    this.endAngle = endAngle;
    this.clockwise = clockwise;
  }

  /** 是否是圆形（辅助判断） */
  get isCircle(): boolean {
    return this.radius === this.radiusY;
  }

  /** 是否是完整圆或完整椭圆（start = 0, end = 2π） */
  get isFullCircle(): boolean {
    return (
      Math.abs(this.endAngle - this.startAngle) >= Math.PI * 2 &&
      this.isCircle
    );
  }
}
