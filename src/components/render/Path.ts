import { IComponent } from "../IComponent.ts";
import { RenderComponent } from "./RenderComponent.ts";
// todo 暂不支持
/** 🧩 支持的路径命令 */
export type IPathCommand =
  | { type: "moveTo"; x: number; y: number }
  | { type: "lineTo"; x: number; y: number }
  | { type: "quadraticCurveTo"; cp: [number, number]; end: [number, number] }
  | { type: "bezierCurveTo"; cp1: [number, number]; cp2: [number, number]; end: [number, number] }
  | { type: "arc"; center: [number, number]; radius: number; start: number; end: number; counterClockwise?: boolean }
  | { type: "arcTo"; cp1: [number, number]; cp2: [number, number]; radius: number }
  | { type: "ellipse"; center: [number, number]; radiusX: number; radiusY: number; rotation?: number; start?: number; end?: number; counterClockwise?: boolean } // 新增椭圆
  | { type: "close" };

export class Path extends RenderComponent implements IComponent {
  commands: IPathCommand[] = [];
  strokeStyle?: string;
  fillStyle?: string;
  lineWidth: number = 1;
  alpha: number = 1.0;
  render: boolean = true;

  /** 🆕 缓存 Path2D 对象 */
  path2D?: Path2D;

  constructor(options: Partial<Path> & { commands?: IPathCommand[] } = {}) {
    super();
    this.commands = options.commands || [];
    this.strokeStyle = options.strokeStyle || "#000000";
    this.fillStyle = options.fillStyle || undefined;
    this.lineWidth = options.lineWidth ?? 1;
    this.alpha = options.alpha ?? 1.0;
    this.render = options.render ?? true;
    this.updatePath2D();
  }

  /** 添加一个命令 */
  addCommand(cmd: IPathCommand) {
    this.commands.push(cmd);
    this.updatePath2D();
  }

  /** 清空路径 */
  clear() {
    this.commands.length = 0;
    this.updatePath2D(); // 更新 Path2D
  }

  /** 🆕 根据 commands 更新 Path2D 对象 */
  updatePath2D() {
    const path = new Path2D();

    for (const cmd of this.commands) {
      switch (cmd.type) {
        case "moveTo":
          path.moveTo(cmd.x, cmd.y);
          break;
        case "lineTo":
          path.lineTo(cmd.x, cmd.y);
          break;
        case "quadraticCurveTo":
          path.quadraticCurveTo(cmd.cp[0], cmd.cp[1], cmd.end[0], cmd.end[1]);
          break;
        case "bezierCurveTo":
          path.bezierCurveTo(cmd.cp1[0], cmd.cp1[1], cmd.cp2[0], cmd.cp2[1], cmd.end[0], cmd.end[1]);
          break;
        case "arc":
          path.arc(cmd.center[0], cmd.center[1], cmd.radius, cmd.start, cmd.end, cmd.counterClockwise);
          break;
        case "arcTo":
          path.arcTo(cmd.cp1[0], cmd.cp1[1], cmd.cp2[0], cmd.cp2[1], cmd.radius);
          break;
        case "ellipse":
          path.ellipse(
            cmd.center[0],
            cmd.center[1],
            cmd.radiusX,
            cmd.radiusY,
            cmd.rotation ?? 0,
            cmd.start ?? 0,
            cmd.end ?? 2 * Math.PI,
            cmd.counterClockwise ?? false
          );
          break;
        case "close":
          path.closePath();
          break;
      }
    }

    this.path2D = path;
  }
}
