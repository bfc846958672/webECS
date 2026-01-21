import { Geometry, Mesh, Program, Camera } from '../../../webgl/index';
import { Transform } from '../../../components/Transform';
import { Point } from '../../../components/render/Point';
import { clamp01, parseColorStyleBlack } from '../../../utils/color';

let pointProgram: Program | null = null;
let geometry: Geometry | null = null;
let mesh: Mesh | null = null;
let aWorldMatrixData = new Float32Array(9);
let aColorData = new Float32Array(4);
let aPointSizeData = new Float32Array(1);

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
    aColorData[0] = rgba[0];
    aColorData[1] = rgba[1];
    aColorData[2] = rgba[2];
    aColorData[3] = rgba[3] * alpha;
    aPointSizeData[0] = size;

    const program = getOrCreatePointProgram(gl);

    aWorldMatrixData.set(transform.worldMatrix);

    if (!geometry) {
        geometry = new Geometry(gl, {
            position: { data: new Float32Array([0, 0]), size: 2, usage: gl.DYNAMIC_DRAW },
            aColor: { data: aColorData, size: 4, usage: gl.DYNAMIC_DRAW },
            aWorldMatrix: { data: aWorldMatrixData, size: 9, instanced: 1, usage: gl.DYNAMIC_DRAW },
            aPointSize: { data: aPointSizeData, size: 1, instanced: 1, usage: gl.DYNAMIC_DRAW },
        });
        geometry.setInstancedCount(1);

        mesh = new Mesh(gl, { geometry, program, mode: gl.POINTS, frustumCulled: false });
    } else {
        geometry.attributes.position.data = new Float32Array([0, 0]);
        geometry.attributes.position.needsUpdate = true;
        geometry.updateAttribute(geometry.attributes.position);

        geometry.attributes.aColor.data = aColorData;
        geometry.attributes.aColor.needsUpdate = true;
        geometry.updateAttribute(geometry.attributes.aColor);

        geometry.attributes.aWorldMatrix.data = aWorldMatrixData;
        geometry.attributes.aWorldMatrix.needsUpdate = true;
        geometry.updateAttribute(geometry.attributes.aWorldMatrix);

        geometry.attributes.aPointSize.data = aPointSizeData;
        geometry.attributes.aPointSize.needsUpdate = true;
        geometry.updateAttribute(geometry.attributes.aPointSize);
    }

    mesh!.draw({ camera });

}
