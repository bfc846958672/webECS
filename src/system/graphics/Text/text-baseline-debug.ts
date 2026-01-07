import { Geometry, Mesh, Program, Camera } from '../../../webgl/index';
import { Transform } from '../../../components/Transform';

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

export type DebugBaselineLine = {
    y: number;
    color: [number, number, number, number];
};

export function renderBaselineDebugLines(
    gl: WebGL2RenderingContext,
    camera: Camera,
    transform: Transform,
    width: number,
    anchorX: number,
    anchorY: number,
    lines: DebugBaselineLine[],
) {
    if (!lines || lines.length === 0) return;

    const x0 = -anchorX;
    const x1 = width - anchorX;

    const positions: number[] = [];
    const colors: number[] = [];
    for (const l of lines) {
        const y = l.y - anchorY;
        positions.push(x0, y, x1, y);
        colors.push(...l.color, ...l.color);
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
