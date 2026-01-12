import { Geometry, Mesh, Program, Camera } from '../../../webgl/index';
import { Transform } from '../../../components/Transform';
import { Point } from '../../../components/render/Point';
import { clamp01, parseColorStyleBlack } from '../../../utils/color';

let pointProgram: Program | null = null;

function getOrCreatePointProgram(gl: WebGL2RenderingContext): Program {
    if (pointProgram) return pointProgram;

    const vertex = `#version 300 es
        precision highp float;

        in vec2 position;
        in vec4 aColor;
        in mat3 aWorldMatrix;
        in float aPointSize;

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
            gl_PointSize = max(aPointSize, 0.0);
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
    });

    return pointProgram;
}

export function renderPoint(gl: WebGL2RenderingContext, camera: Camera, transform: Transform, point: Point) {
    const size = Math.max(0, Number(point.size || 0));
    if (size <= 0) return;

    const alpha = point.alpha == null ? 1 : clamp01(Number(point.alpha));
    const rgba = parseColorStyleBlack(point.fillStyle);
    const color: [number, number, number, number] = [rgba[0], rgba[1], rgba[2], rgba[3] * alpha];

    const program = getOrCreatePointProgram(gl);

    const aWorldMatrix = new Float32Array(transform.worldMatrix);
    const geometry = new Geometry(gl, {
        position: { data: new Float32Array([0, 0]), size: 2, usage: gl.DYNAMIC_DRAW },
        aColor: { data: new Float32Array(color), size: 4, usage: gl.DYNAMIC_DRAW },
        aWorldMatrix: { data: aWorldMatrix, size: 9, instanced: 1, usage: gl.DYNAMIC_DRAW },
        aPointSize: { data: new Float32Array([size]), size: 1, instanced: 1, usage: gl.DYNAMIC_DRAW },
    });
    // geometry.setInstancedCount(1);

    const mesh = new Mesh(gl, { geometry, program, mode: gl.POINTS, frustumCulled: false });
    mesh.draw({ camera });

}
