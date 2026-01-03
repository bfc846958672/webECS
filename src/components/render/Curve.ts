import { IComponent } from "../IComponent";
import { RenderComponent } from "./RenderComponent";
import { Engine } from "../../engine/Engine";

export class Curve extends RenderComponent implements IComponent {
  start: [number, number] = [0, 0];
  cp1: [number, number] = [0, 0];
  cp2?: [number, number];
  end: [number, number] = [0, 0];

  strokeStyle: string = "#000";
  lineWidth: number = 1;
  alpha: number = 1;
  render: boolean = true;
  // 填充图形
  fill: string | undefined;

  constructor(engine: Engine | null, opts: Partial<Curve> = {}) {
    super(engine);
    this.start = opts.start || this.start;
    this.cp1 = opts.cp1 || this.cp1;
    this.cp2 = opts.cp2 || this.cp2;
    this.end = opts.end || this.end;
    this.strokeStyle = opts.strokeStyle || this.strokeStyle;
    this.lineWidth = opts.lineWidth || this.lineWidth;
    this.alpha = opts.alpha || this.alpha;
    this.render = opts.render || this.render;
    this.fill = opts.fill || this.fill;
  }
}
