import { Geometry, Mesh, Program, Camera } from '../../../webgl/index';
import { Transform } from '../../../components/Transform';
import { Point } from '../../../components/render/Point';

let pointProgram: Program | null = null;

function clamp01(v: number): number {
    return Math.max(0, Math.min(1, v));
}

function parseColorStyle(style: string | number[]): [number, number, number, number] {
    if (Array.isArray(style)) {
        const [r = 0, g = 0, b = 0, a = 1] = style;
        return [clamp01(r), clamp01(g), clamp01(b), clamp01(a)];
    }

    if (typeof style !== 'string') return [0, 0, 0, 1];
    const s = style.trim();

    if (s.startsWith('#')) {
        const hex = s.slice(1);
        if (hex.length === 6 || hex.length === 8) {
            const r = parseInt(hex.slice(0, 2), 16) / 255;
            const g = parseInt(hex.slice(2, 4), 16) / 255;
            const b = parseInt(hex.slice(4, 6), 16) / 255;
            const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
            return [clamp01(r), clamp01(g), clamp01(b), clamp01(a)];
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

    return [0, 0, 0, 1];
}

function getOrCreatePointProgram(gl: WebGL2RenderingContext): Program {
    if (pointProgram) return pointProgram;

    const vertex = `#version 300 es
        precision highp float;

        in vec2 position;
        in vec4 aColor;
        in mat3 aWorldMatrix;

        uniform mat4 projectionMatrix;
        uniform mat4 viewMatrix;
        uniform float uPointSize;

        out vec4 vColor;

        void main() {
            vColor = aColor;
            mat4 worldMatrix4 = mat4(
                vec4(aWorldMatrix[0][0], aWorldMatrix[0][1], 0.0, 0.0),
                vec4(aWorldMatrix[1][0], aWorldMatrix[1][1], 0.0, 0.0),
                vec4(0.0, 0.0, 1.0, 0.0),
                vec4(aWorldMatrix[2][0], aWorldMatrix[2][1], 0.0, 1.0)
            );
            gl_PointSize = uPointSize;
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

    pointProgram = new Program(gl, {
        vertex,
        fragment,
        transparent: true,
        cullFace: 0 as any,
        depthTest: false,
        depthWrite: false,
        uniforms: {
            uPointSize: { value: 4 },
        },
    });

    return pointProgram;
}

export function renderPoint(gl: WebGL2RenderingContext, camera: Camera, transform: Transform, point: Point) {
    const size = Math.max(0, Number(point.size || 0));
    if (size <= 0) return;

    const alpha = point.alpha == null ? 1 : clamp01(Number(point.alpha));
    const rgba = parseColorStyle(point.fillStyle);
    const color: [number, number, number, number] = [rgba[0], rgba[1], rgba[2], rgba[3] * alpha];

    const program = getOrCreatePointProgram(gl);
    program.uniforms.uPointSize.value = size;

    const aWorldMatrix = new Float32Array(transform.worldMatrix);
    const geometry = new Geometry(gl, {
        position: { data: new Float32Array([0, 0]), size: 2, usage: gl.DYNAMIC_DRAW },
        aColor: { data: new Float32Array(color), size: 4, usage: gl.DYNAMIC_DRAW },
        aWorldMatrix: { data: aWorldMatrix, size: 9, instanced: 1, usage: gl.DYNAMIC_DRAW },
    });
    geometry.setInstancedCount(1);

    const mesh = new Mesh(gl, { geometry, program, mode: gl.POINTS, frustumCulled: false });
    mesh.draw({ camera });
}
