import { ISystem } from "../../interface/System.ts";
import { SceneTree } from "../../scene/SceneTree.ts";
import { IProcess } from "../../interface/System.ts";
import { Engine } from "../../engine/Engine.ts";
import { IShareContext } from "../../interface/System.ts";
import { BoundingBoxComponent } from "../../main.ts";
import { IAABB } from "../../interface/AABB.ts";
import { Geometry, Mesh, Program } from "../../webgl/index.ts";

function clamp01(v: number): number {
    return Math.max(0, Math.min(1, v));
}

function parseColorStyle(style: string | number[]): [number, number, number, number] {
    if (Array.isArray(style)) {
        const [r = 1, g = 1, b = 1, a = 1] = style;
        return [clamp01(r), clamp01(g), clamp01(b), clamp01(a)];
    }

    if (typeof style !== 'string') return [1, 1, 1, 1];
    const s = style.trim();

    if (s.startsWith('#')) {
        const hex = s.slice(1);
        if (hex.length === 6 || hex.length === 8) {
            const r = parseInt(hex.slice(0, 2), 16) / 255;
            const g = parseInt(hex.slice(2, 4), 16) / 255;
            const b = parseInt(hex.slice(4, 6), 16) / 255;
            const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
            return [r, g, b, a];
        }
    }

    const m = s.match(/^rgba\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)\s*$/i);
    if (m) {
        const r = clamp01(Number(m[1]) / 255);
        const g = clamp01(Number(m[2]) / 255);
        const b = clamp01(Number(m[3]) / 255);
        const a = clamp01(Number(m[4]));
        return [r, g, b, a];
    }

    return [1, 1, 1, 1];
}

function appendAABBLineSegments(out: number[], aabb: IAABB) {
    if (!Number.isFinite(aabb.minX) || !Number.isFinite(aabb.minY) || !Number.isFinite(aabb.maxX) || !Number.isFinite(aabb.maxY)) {
        return;
    }

    const x0 = aabb.minX;
    const y0 = aabb.minY;
    const x1 = aabb.maxX;
    const y1 = aabb.maxY;

    // gl.LINES: each pair is a segment
    out.push(
        x0, y0,  x1, y0,
        x1, y0,  x1, y1,
        x1, y1,  x0, y1,
        x0, y1,  x0, y0,
    );
}

function createBBoxProgram(gl: WebGL2RenderingContext) {
    const vertex = `#version 300 es
        precision highp float;

        in vec2 position;

        uniform mat4 projectionMatrix;
        uniform mat4 viewMatrix;
        uniform vec4 uColor;

        out vec4 vColor;

        void main() {
            vColor = uColor;
            gl_Position = projectionMatrix * viewMatrix * vec4(position, 0.0, 1.0);
        }
    `;

    const fragment = `#version 300 es
        precision highp float;
        in vec4 vColor;
        out vec4 fragColor;
        void main() {
            fragColor = vColor;
        }
    `;

    return new Program(gl, {
        vertex,
        fragment,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
            uColor: { value: [1, 0, 0, 1] },
        },
    });
}

function drawAABBs(gl: WebGL2RenderingContext, camera: any, aabbs: IAABB[], color: string | number[], lineWidth: number) {
    const positionsArr: number[] = [];
    for (const aabb of aabbs) appendAABBLineSegments(positionsArr, aabb);
    if (positionsArr.length === 0) return;

    // 兼容性：大多数平台 lineWidth 实际只支持 1，但按需设置
    try { gl.lineWidth(Math.max(1, Number(lineWidth) || 1)); } catch { /* ignore */ }

    const program = createBBoxProgram(gl);
    program.uniforms.uColor.value = parseColorStyle(color as any);

    const geometry = new Geometry(gl, {
        position: { data: new Float32Array(positionsArr), size: 2, usage: gl.DYNAMIC_DRAW },
    });

    const mesh = new Mesh(gl, { geometry, program, mode: gl.LINES, frustumCulled: false });
    mesh.draw({ camera });
}
export class BoxDebugSystem extends ISystem {
    constructor(public engine: Engine, public sceneTree: SceneTree) {
        super(engine, sceneTree);
    }
    processes: IProcess<{ dirty: boolean }, { dirty: boolean }>[] = [];
    protected onInit(): void {
        // WebGL debug draw，不需要 2D ctx
    }

    update(_delta: number): void {
        if (!(this.engine).boxDebug) return;

        const gl = this.engine.renderContext.renderer.gl as WebGL2RenderingContext;
        const camera = this.engine.renderContext.camera;

        const totalAABBs: IAABB[] = [];
        const selfAABBs: IAABB[] = [];
        const childrenAABBs: IAABB[] = [];

        const displayList = this.sceneTree.displayList;
        // 逆序遍历：尽量让后渲染的框在上面（虽然线段没有 depth）
        for (let i = displayList.length - 1; i >= 0; i--) {
            const [entityId] = displayList[i];
            const bbox = this.ecs.getComponent(entityId, BoundingBoxComponent);
            if (!bbox) continue;
            totalAABBs.push(bbox.totalAABB);
            selfAABBs.push(bbox.selfAABB);
            // childrenAABBs.push(bbox.childrenAABB);
        }

        // 颜色/线宽：对齐旧 Canvas 调试风格
        drawAABBs(gl, camera, totalAABBs, '#ff0000', 1);
        drawAABBs(gl, camera, selfAABBs, '#fff', 3);
        // drawAABBs(gl, camera, childrenAABBs, 'green', 2);
    }
}
