import { vec2, mat3 } from "gl-matrix";
import { ECS } from "../../ecs/ECS";
import { Transform } from "../../components/Transform";
import { Path } from "../../components/render/Path";
import { IBoundingBoxStrategy } from "./AABB";

export class PathBoundingBox implements IBoundingBoxStrategy {
    private offscreenCanvas: HTMLCanvasElement;
    private offscreenCtx: CanvasRenderingContext2D;

    constructor() {
        this.offscreenCanvas = document.createElement("canvas");
        this.offscreenCanvas.width = 1;
        this.offscreenCanvas.height = 1;
        const ctx = this.offscreenCanvas.getContext("2d");
        if (!ctx) throw new Error("Offscreen canvas context not available");
        this.offscreenCtx = ctx;
    }

    match(ecs: ECS, entityId: number) {
        return ecs.hasComponent(entityId, Path);
    }

    computeAABB(ecs: ECS, entityId: number) {
        const path = ecs.getComponent(entityId, Path)!;
        const transform = ecs.getComponent(entityId, Transform)!;
        const m = transform.worldMatrix;

        const points: vec2[] = [];
        let lastPos: [number, number] = [0, 0];
        const steps = 20;

        for (const cmd of path.commands) {
            switch (cmd.type) {
                case "moveTo":
                    lastPos = [cmd.x, cmd.y];
                    points.push(vec2.fromValues(...lastPos));
                    break;
                case "lineTo":
                    lastPos = [cmd.x, cmd.y];
                    points.push(vec2.fromValues(...lastPos));
                    break;
                case "quadraticCurveTo":
                    for (let t = 0; t <= 1; t += 1 / steps) {
                        const u = 1 - t;
                        const x = u ** 2 * lastPos[0] + 2 * u * t * cmd.cp[0] + t ** 2 * cmd.end[0];
                        const y = u ** 2 * lastPos[1] + 2 * u * t * cmd.cp[1] + t ** 2 * cmd.end[1];
                        points.push(vec2.fromValues(x, y));
                    }
                    lastPos = [...cmd.end];
                    break;
                case "bezierCurveTo":
                    for (let t = 0; t <= 1; t += 1 / steps) {
                        const u = 1 - t;
                        const x =
                            u ** 3 * lastPos[0] +
                            3 * u ** 2 * t * cmd.cp1[0] +
                            3 * u * t ** 2 * cmd.cp2[0] +
                            t ** 3 * cmd.end[0];
                        const y =
                            u ** 3 * lastPos[1] +
                            3 * u ** 2 * t * cmd.cp1[1] +
                            3 * u * t ** 2 * cmd.cp2[1] +
                            t ** 3 * cmd.end[1];
                        points.push(vec2.fromValues(x, y));
                    }
                    lastPos = [...cmd.end];
                    break;
                case "arc": {
                    const [cx, cy] = cmd.center;
                    for (let t = 0; t <= 1; t += 1 / steps) {
                        const angle = cmd.start + t * (cmd.end - cmd.start);
                        const x = cx + cmd.radius * Math.cos(angle);
                        const y = cy + cmd.radius * Math.sin(angle);
                        points.push(vec2.fromValues(x, y));
                    }
                    lastPos = [cx + cmd.radius * Math.cos(cmd.end), cy + cmd.radius * Math.sin(cmd.end)];
                    break;
                }
                case "arcTo":
                    points.push(vec2.fromValues(cmd.cp1[0], cmd.cp1[1]));
                    points.push(vec2.fromValues(cmd.cp2[0], cmd.cp2[1]));
                    lastPos = [...cmd.cp2];
                    break;
                case "ellipse": {
                    const [cx, cy] = cmd.center;
                    const rx = cmd.radiusX;
                    const ry = cmd.radiusY;
                    const rotation = cmd.rotation ?? 0;
                    for (let t = 0; t <= 1; t += 1 / steps) {
                        const angle = t * 2 * Math.PI;
                        const cos = Math.cos(angle);
                        const sin = Math.sin(angle);
                        const x = cx + rx * cos * Math.cos(rotation) - ry * sin * Math.sin(rotation);
                        const y = cy + rx * cos * Math.sin(rotation) + ry * sin * Math.cos(rotation);
                        points.push(vec2.fromValues(x, y));
                    }
                    lastPos = [cx + rx * Math.cos(0), cy + ry * Math.sin(0)];
                    break;
                }
                case "close":
                    break;
            }
        }

        const worldPoints = points.map(p => vec2.transformMat3(vec2.create(), p, m));
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of worldPoints) {
            minX = Math.min(minX, p[0]);
            minY = Math.min(minY, p[1]);
            maxX = Math.max(maxX, p[0]);
            maxY = Math.max(maxY, p[1]);
        }

        return { minX, minY, maxX, maxY };
    }

    hit(ecs: ECS, entityId: number, x: number, y: number): boolean {
        const path = ecs.getComponent(entityId, Path)!;
        const transform = ecs.getComponent(entityId, Transform)!;
        const m = transform.worldMatrix;

        const inv = mat3.create();
        mat3.invert(inv, m);
        const local = vec2.fromValues(x, y);
        vec2.transformMat3(local, local, inv);

        const hasClose = path.commands.some(cmd => cmd.type === "close");

        if (path.path2D) {
            const ctx = this.offscreenCtx;
            ctx.save();
            ctx.clearRect(0, 0, 1, 1);
            ctx.lineWidth = path.lineWidth ?? 1;
            const result = hasClose 
                ? ctx.isPointInPath(path.path2D, local[0], local[1])
                : ctx.isPointInStroke(path.path2D, local[0], local[1]);
            ctx.restore();
            return result;
        } else {
            if (hasClose) {
                return this.isPointInPath(path, local[0], local[1]);
            } else {
                return PathBoundingBox.isPointNearPath(path, local[0], local[1]);
            }
        }
    }

    private isPointInPath(path: Path, x: number, y: number): boolean {
        const ctx = this.offscreenCtx;
        ctx.save();
        ctx.clearRect(0, 0, 1, 1);

        ctx.beginPath();
        for (const cmd of path.commands) {
            switch (cmd.type) {
                case "moveTo": ctx.moveTo(cmd.x, cmd.y); break;
                case "lineTo": ctx.lineTo(cmd.x, cmd.y); break;
                case "quadraticCurveTo": ctx.quadraticCurveTo(cmd.cp[0], cmd.cp[1], cmd.end[0], cmd.end[1]); break;
                case "bezierCurveTo": ctx.bezierCurveTo(cmd.cp1[0], cmd.cp1[1], cmd.cp2[0], cmd.cp2[1], cmd.end[0], cmd.end[1]); break;
                case "arc": ctx.arc(cmd.center[0], cmd.center[1], cmd.radius, cmd.start, cmd.end, cmd.counterClockwise); break;
                case "arcTo": ctx.arcTo(cmd.cp1[0], cmd.cp1[1], cmd.cp2[0], cmd.cp2[1], cmd.radius); break;
                case "ellipse": ctx.ellipse(cmd.center[0], cmd.center[1], cmd.radiusX, cmd.radiusY, cmd.rotation ?? 0, 0, 2 * Math.PI); break;
                case "close": ctx.closePath(); break;
            }
        }

        const result = ctx.isPointInPath(x, y);
        ctx.restore();
        return result;
    }

    static isPointNearPath(path: Path, x: number, y: number): boolean {
        const steps = 50;
        const lineWidth = path.lineWidth ?? 5;
        let lastPos: [number, number] = [0, 0];
        let minDist = Infinity;

        for (const cmd of path.commands) {
            switch (cmd.type) {
                case "moveTo": lastPos = [cmd.x, cmd.y]; break;
                case "lineTo": {
                    const dx = cmd.x - lastPos[0];
                    const dy = cmd.y - lastPos[1];
                    if (dx !== 0 || dy !== 0) {
                        const t = ((x - lastPos[0]) * dx + (y - lastPos[1]) * dy) / (dx * dx + dy * dy);
                        const tt = Math.max(0, Math.min(1, t));
                        const px = lastPos[0] + dx * tt;
                        const py = lastPos[1] + dy * tt;
                        minDist = Math.min(minDist, Math.hypot(x - px, y - py));
                    }
                    lastPos = [cmd.x, cmd.y];
                    break;
                }
                case "quadraticCurveTo":
                    for (let t = 0; t <= 1; t += 1 / steps) {
                        const u = 1 - t;
                        const px = u ** 2 * lastPos[0] + 2 * u * t * cmd.cp[0] + t ** 2 * cmd.end[0];
                        const py = u ** 2 * lastPos[1] + 2 * u * t * cmd.cp[1] + t ** 2 * cmd.end[1];
                        minDist = Math.min(minDist, Math.hypot(x - px, y - py));
                    }
                    lastPos = [...cmd.end];
                    break;
                case "bezierCurveTo":
                    for (let t = 0; t <= 1; t += 1 / steps) {
                        const u = 1 - t;
                        const px =
                            u ** 3 * lastPos[0] +
                            3 * u ** 2 * t * cmd.cp1[0] +
                            3 * u * t ** 2 * cmd.cp2[0] +
                            t ** 3 * cmd.end[0];
                        const py =
                            u ** 3 * lastPos[1] +
                            3 * u ** 2 * t * cmd.cp1[1] +
                            3 * u * t ** 2 * cmd.cp2[1] +
                            t ** 3 * cmd.end[1];
                        minDist = Math.min(minDist, Math.hypot(x - px, y - py));
                    }
                    lastPos = [...cmd.end];
                    break;
                case "arc": {
                    const [cx, cy] = cmd.center;
                    const startAngle = cmd.start;
                    const endAngle = cmd.end;
                    const stepAngle = (endAngle - startAngle) / steps;
                    for (let i = 0; i <= steps; i++) {
                        const angle = startAngle + stepAngle * i;
                        const px = cx + cmd.radius * Math.cos(angle);
                        const py = cy + cmd.radius * Math.sin(angle);
                        minDist = Math.min(minDist, Math.hypot(x - px, y - py));
                    }
                    lastPos = [cx + cmd.radius * Math.cos(endAngle), cy + cmd.radius * Math.sin(endAngle)];
                    break;
                }
                case "arcTo": {
                    const [x1, y1] = lastPos;
                    const [x2, y2] = cmd.cp1;
                    const [x3, y3] = cmd.cp2;
                    const r = cmd.radius;

                    const dx1 = x1 - x2;
                    const dy1 = y1 - y2;
                    const dx2 = x3 - x2;
                    const dy2 = y3 - y2;

                    const a1 = Math.atan2(dy1, dx1);
                    const a2 = Math.atan2(dy2, dx2);
                    const angleDiff = ((a2 - a1 + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

                    const centerAngle = a1 + angleDiff / 2;
                    const cx = x2 + r * Math.cos(centerAngle + Math.PI / 2);
                    const cy = y2 + r * Math.sin(centerAngle + Math.PI / 2);

                    const startAngle = Math.atan2(y1 - cy, x1 - cx);
                    const endAngle = Math.atan2(y3 - cy, x3 - cx);

                    for (let i = 0; i <= steps; i++) {
                        const t = i / steps;
                        const angle = startAngle + (endAngle - startAngle) * t;
                        const px = cx + r * Math.cos(angle);
                        const py = cy + r * Math.sin(angle);
                        minDist = Math.min(minDist, Math.hypot(x - px, y - py));
                    }
                    lastPos = [x3, y3];
                    break;
                }
                case "ellipse": {
                    const [cx, cy] = cmd.center;
                    const rx = cmd.radiusX;
                    const ry = cmd.radiusY;
                    const rotation = cmd.rotation ?? 0;
                    for (let i = 0; i <= steps; i++) {
                        const t = i / steps * 2 * Math.PI;
                        const cos = Math.cos(t);
                        const sin = Math.sin(t);
                        const px = cx + rx * cos * Math.cos(rotation) - ry * sin * Math.sin(rotation);
                        const py = cy + rx * cos * Math.sin(rotation) + ry * sin * Math.cos(rotation);
                        minDist = Math.min(minDist, Math.hypot(x - px, y - py));
                    }
                    lastPos = [cx + rx * Math.cos(0), cy + ry * Math.sin(0)];
                    break;
                }
                case "close": break;
            }
        }

        return minDist <= Math.max(5, lineWidth / 2);
    }
}
