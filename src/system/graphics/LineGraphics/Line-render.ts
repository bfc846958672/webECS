import { Geometry, Mesh, Program, Camera } from '../../../webgl/index';
import { Transform } from '../../../components/Transform';
import { Line } from '../../../components/render/Line';
import { clamp01, parseColorStyleBlack } from '../../../utils/color';

let lineProgram: Program | null = null;

function getOrCreateLineProgram(gl: WebGL2RenderingContext): Program {
    if (lineProgram) return lineProgram;

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

    lineProgram = new Program(gl, {
        vertex,
        fragment,
        transparent: true,
        cullFace: 0 as any,
        depthTest: false,
        depthWrite: false,
        uniforms: {},
    });

    return lineProgram;
}

function buildLineSegments(points: [number, number][]): Float32Array {
    // 使用 gl.LINES：把折线展开成一段段线段（p0-p1, p1-p2, ...）
    const n = points.length;
    const out: number[] = [];
    for (let i = 0; i < n - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        out.push(a[0], a[1], b[0], b[1]);
    }
    return new Float32Array(out);
}

export function renderLine(gl: WebGL2RenderingContext, camera: Camera, transform: Transform, line: Line) {
    const pts = line.points;
    if (!line.render || !pts || pts.length < 2) return;

    const alpha = line.alpha == null ? 1 : clamp01(Number(line.alpha));
    const stroke = parseColorStyleBlack((line as any).strokeStyle);
    const color: [number, number, number, number] = [stroke[0], stroke[1], stroke[2], stroke[3] * alpha];

    const program = getOrCreateLineProgram(gl);

    const positions = buildLineSegments(pts);
    if (positions.length < 4) return;

    const vertexCount = positions.length / 2;
    const colors = new Float32Array(vertexCount * 4);
    for (let i = 0; i < vertexCount; i++) {
        colors[i * 4 + 0] = color[0];
        colors[i * 4 + 1] = color[1];
        colors[i * 4 + 2] = color[2];
        colors[i * 4 + 3] = color[3];
    }

    const aWorldMatrix = new Float32Array(transform.worldMatrix);
    const geometry = new Geometry(gl, {
        position: { data: positions, size: 2, usage: gl.DYNAMIC_DRAW },
        aColor: { data: colors, size: 4, usage: gl.DYNAMIC_DRAW },
        aWorldMatrix: { data: aWorldMatrix, size: 9, instanced: 1, usage: gl.DYNAMIC_DRAW },
    });
    geometry.setInstancedCount(1);

    const mesh = new Mesh(gl, { geometry, program, mode: gl.LINES, frustumCulled: false });
    mesh.draw({ camera });
}
