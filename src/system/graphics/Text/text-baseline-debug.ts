import { Geometry, Mesh, Program, Camera } from '../../../webgl/index';
import { Transform } from '../../../components/Transform';
import type { FontTextCalculator } from './FontTextCalculator';

let debugLineProgram: Program | null = null;

function getOrCreateDebugLineProgram(gl: WebGL2RenderingContext): Program {
    if (debugLineProgram) return debugLineProgram;

    const vertex = `#version 300 es
        precision highp float;

        in vec2 position;
        in vec4 aColor;
        in mat3 aWorldMatrix;

        uniform mat4 projectionMatrix;
        uniform mat4 viewMatrix;

        out vec4 vColor;

        void main() {
            vColor = aColor;
            mat4 worldMatrix4 = mat4(
                vec4(aWorldMatrix[0][0], aWorldMatrix[0][1], 0.0, 0.0),
                vec4(aWorldMatrix[1][0], aWorldMatrix[1][1], 0.0, 0.0),
                vec4(0.0, 0.0, 1.0, 0.0),
                vec4(aWorldMatrix[2][0], aWorldMatrix[2][1], 0.0, 1.0)
            );
            gl_Position = projectionMatrix * viewMatrix * worldMatrix4 * vec4(position, 0.0, 1.0);
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

    debugLineProgram = new Program(gl, {
        vertex,
        fragment,
        transparent: true,
        cullFace: 0 as any,
        depthTest: false,
        depthWrite: false,
    });

    return debugLineProgram;
}

export function renderBaselineDebugLines(
    gl: WebGL2RenderingContext,
    camera: Camera,
    transform: Transform,
    calc: FontTextCalculator,
    anchorX: number,
    anchorY: number,
) {
    // 需求：渲染“字体设计盒”和“布局内联盒”，以及设计盒里的英文/中文基线。
    const rects = [
        // 设计盒（asc/desc）
        {
            minX: calc.designBox.minX,
            minY: calc.designBox.minY,
            maxX: calc.designBox.maxX,
            maxY: calc.designBox.maxY,
            color: [0, 0, 0, 1] as const,
        },
        // // 内联盒（用户 lineHeight，默认 1.4 * fontSize）
        {
            minX: calc.inlineBox.minX,
            minY: calc.inlineBox.minY,
            maxX: calc.inlineBox.maxX,
            maxY: calc.inlineBox.maxY,
            color: [1, 0, 1, 1] as const,
        },
    ];
    const lines = [
        // 英文基线：alphabetic
        { y: calc.designBox.alphabeticBaselineY, color: [0, 0.6, 1, 1] as const },
        // 中文基线：ideographic（使用 descender）
        { y: calc.designBox.ideographicBaselineY, color: [1, 0.6, 0, 1] as const },
    ];

    const x0 = -anchorX;
    const textWidth = calc.width;
    const baselineX0 = x0 + textWidth * 0.1;
    const baselineX1 = x0 + textWidth * 0.9;

    const positions: number[] = [];
    const colors: number[] = [];

    for (const l of lines) {
        const y = l.y - anchorY;
        positions.push(baselineX0, y, baselineX1, y);
        colors.push(...l.color, ...l.color);
    }

    for (const r of rects) {
        const minX = r.minX - anchorX;
        const maxX = r.maxX - anchorX;
        const minY = r.minY - anchorY;
        const maxY = r.maxY - anchorY;

        // top
        positions.push(minX, minY, maxX, minY);
        colors.push(...r.color, ...r.color);
        // right
        positions.push(maxX, minY, maxX, maxY);
        colors.push(...r.color, ...r.color);
        // bottom
        positions.push(maxX, maxY, minX, maxY);
        colors.push(...r.color, ...r.color);
        // left
        positions.push(minX, maxY, minX, minY);
        colors.push(...r.color, ...r.color);
    }

    const program = getOrCreateDebugLineProgram(gl);
    const aWorldMatrix = new Float32Array(transform.worldMatrix);
    const geometry = new Geometry(gl, {
        position: { data: new Float32Array(positions), size: 2, usage: gl.DYNAMIC_DRAW },
        aColor: { data: new Float32Array(colors), size: 4, usage: gl.DYNAMIC_DRAW },
        aWorldMatrix: { data: aWorldMatrix, size: 9, instanced: 1, usage: gl.DYNAMIC_DRAW },
    });
    geometry.setInstancedCount(1);
    const mesh = new Mesh(gl, { geometry, program, mode: gl.LINES, frustumCulled: false });
    mesh.draw({ camera });
}
