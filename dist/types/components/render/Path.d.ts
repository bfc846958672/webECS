import { IComponent } from '../../ecs/interface/IComponent.ts';
import { RenderComponent } from './RenderComponent.ts';
import { Engine } from '../../ecs/Engine.ts';
/** 🧩 支持的路径命令 */
export type IPathCommand = {
    type: "moveTo";
    x: number;
    y: number;
} | {
    type: "lineTo";
    x: number;
    y: number;
} | {
    type: "quadraticCurveTo";
    cp: [number, number];
    end: [number, number];
} | {
    type: "bezierCurveTo";
    cp1: [number, number];
    cp2: [number, number];
    end: [number, number];
} | {
    type: "arc";
    center: [number, number];
    radius: number;
    start: number;
    end: number;
    counterClockwise?: boolean;
} | {
    type: "arcTo";
    cp1: [number, number];
    cp2: [number, number];
    radius: number;
} | {
    type: "ellipse";
    center: [number, number];
    radiusX: number;
    radiusY: number;
    rotation?: number;
    start?: number;
    end?: number;
    counterClockwise?: boolean;
} | {
    type: "close";
};
export declare class Path extends RenderComponent implements IComponent {
    commands: IPathCommand[];
    strokeStyle?: string;
    fillStyle?: string;
    lineWidth: number;
    alpha: number;
    render: boolean;
    /** 🆕 缓存 Path2D 对象 */
    path2D?: Path2D;
    constructor(engine: Engine | null, options?: Partial<Path> & {
        commands?: IPathCommand[];
    });
    /** 添加一个命令 */
    addCommand(cmd: IPathCommand): void;
    /** 清空路径 */
    clear(): void;
    /** 🆕 根据 commands 更新 Path2D 对象 */
    updatePath2D(): void;
}
