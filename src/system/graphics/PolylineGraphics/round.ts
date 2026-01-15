import { Geometry, Mesh, Program, type Camera } from '../../../webgl/index';
import type { RGBA } from '../../../utils/color';
import { vec2, type Vec2 } from '../../../utils/vec2';

// ----------------- 顶点着色器 -----------------
const vertexSource = `#version 300 es
precision highp float;

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;

in vec2 position;   // Quad 本地坐标 (-1..1)
in vec2 aCenter;
in float aRadius;
in vec2 aAngles;
in vec4 aColor;
in mat3 aWorldMatrix;

out vec4 vColor;
out vec2 vCenter;
out float vRadius;
out vec2 vAngle;
out vec2 vLocalPos;

void main() {
    vCenter = aCenter;
    vRadius = aRadius;
    vAngle = aAngles;
    vColor = aColor;

    // 将 quad 局部坐标映射到世界坐标
    vLocalPos = position * vRadius + vCenter;

    mat4 world = mat4(
        vec4(aWorldMatrix[0][0], aWorldMatrix[0][1], 0.0, 0.0),
        vec4(aWorldMatrix[1][0], aWorldMatrix[1][1], 0.0, 0.0),
        vec4(0.0, 0.0, 1.0, 0.0),
        vec4(aWorldMatrix[2][0], aWorldMatrix[2][1], 0.0, 1.0)
    );

    gl_Position = projectionMatrix * viewMatrix * world * vec4(vLocalPos, 0.0, 1.0);
}
`;

// ----------------- 片元着色器 -----------------
const fragmentSource = `#version 300 es
precision highp float;

in vec4 vColor;
in vec2 vCenter;
in float vRadius;
in vec2 vAngle;
in vec2 vLocalPos;

out vec4 fragColor;

void main() {
    vec2 dir = vLocalPos - vCenter;
    float dist = length(dir);
    if(dist > vRadius) discard;

    // 顺时针角度判断
    float a = atan(-dir.y, dir.x); // 注意 y 取负，保证顺时针
    float a0 = vAngle.x;
    float a1 = vAngle.y;

    if(a1 < a0) a1 += 6.2831853; // 2*PI
    if(a < a0) a += 6.2831853;
    if(a > a1) discard;

    fragColor = vColor;
}
`;

let programCache: Program | null = null;
function getProgram(gl: WebGL2RenderingContext) {
    if (programCache) return programCache;
    programCache = new Program(gl, {
        vertex: vertexSource,
        fragment: fragmentSource,
        transparent: true,
        cullFace: gl.NONE,
        depthTest: false,
        depthWrite: false
    });
    return programCache;
}

// ----------------- 绘制扇形 -----------------
export function drawBevelSectors(
    gl: WebGL2RenderingContext,
    camera: Camera,
    aWorldMatrix: Float32Array,
    bevels: Vec2[],
    lineWidth: number,
    strokeColor: RGBA,
    alpha: number
) {
    if (bevels.length === 0) return;

    const positions: number[] = [];
    const centers: number[] = [];
    const radii: number[] = [];
    const angles: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    let vertexCount = 0;

    // Quad 顶点局部坐标 (-1,-1),(1,-1),(1,1),(-1,1)
    const quad = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1]
    ];

    for (let i = 0; i < bevels.length; i += 3) {
        const center = bevels[i];
        const p1 = bevels[i + 1];
        const p2 = bevels[i + 2];

        // 顺时针角度计算（y向下坐标系）
        let a0 = Math.atan2(center[1] - p1[1], p1[0] - center[0]);
        let a1 = Math.atan2(center[1] - p2[1], p2[0] - center[0]);
        if(a1 < a0) a1 += Math.PI * 2;

        const radius = lineWidth / 2;

        // Quad 顶点
        for (let q = 0; q < 4; q++) {
            const p = quad[q];
            positions.push(p[0], p[1]);
            centers.push(center[0], center[1]);
            radii.push(radius);
            angles.push(a0, a1);
            colors.push(strokeColor[0], strokeColor[1], strokeColor[2], strokeColor[3] * alpha);
        }

        // 两个三角形
        indices.push(vertexCount, vertexCount + 1, vertexCount + 2);
        indices.push(vertexCount, vertexCount + 2, vertexCount + 3);
        vertexCount += 4;
    }

    const geometry = new Geometry(gl, {
        position: { data: new Float32Array(positions), size: 2 },
        aCenter: { data: new Float32Array(centers), size: 2 },
        aRadius: { data: new Float32Array(radii), size: 1 },
        aAngles: { data: new Float32Array(angles), size: 2 },
        aColor: { data: new Float32Array(colors), size: 4 },
        aWorldMatrix: { data: aWorldMatrix, size: 9, instanced: 1 },
    });

    const idxArr = vertexCount >= 65536 ? new Uint32Array(indices) : new Uint16Array(indices);
    geometry.setIndex({ data: idxArr, size: 1 });
    geometry.setInstancedCount(1);

    const mesh = new Mesh(gl, {
        geometry,
        program: getProgram(gl),
        frustumCulled: false,
    });

    mesh.draw({ camera });
}
