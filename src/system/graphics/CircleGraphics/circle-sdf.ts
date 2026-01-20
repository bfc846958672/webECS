import { Geometry, Program, Mesh, Camera } from '../../../webgl/index';
import { Circle } from '../../../components/render/Circle';
import { Transform } from '../../../components/Transform';
import { parseColorStyle } from '../../../utils/color';

const vertex = `#version 300 es
        precision highp float;

        // Unit quad (0..1) in local space
        in vec2 position;

        // Per-instance
        in mat3 aWorldMatrix;
        in vec2 aRadii;
        in vec4 aColor;
        in vec4 aStrokeColor;
        in float aLineWidth;
        in vec2 aAngles;
        in float aClockwise;

        uniform mat4 projectionMatrix;
        uniform mat4 viewMatrix;

        out vec2 vLocalPos;
        out vec2 vRadii;
        out vec4 vColor;
        out vec4 vStrokeColor;
        out float vLineWidth;
        out vec2 vAngles;
        out float vClockwise;

        void main() {
            vec2 size = 2.0 * aRadii;
            vec2 localPos = (position - 0.5) * size;
            vLocalPos = localPos;
            vRadii = aRadii;
            vColor = aColor;
            vStrokeColor = aStrokeColor;
            vLineWidth = aLineWidth;
            vAngles = aAngles;
            vClockwise = aClockwise;

            // Embed 2D affine mat3 into a 4x4 matrix to match the camera's mat4 pipeline.
            // GLSL matrices are column-major: m[col][row]. Translation lives in aWorldMatrix[2].xy.
            mat4 worldMatrix4 = mat4(
                vec4(aWorldMatrix[0][0], aWorldMatrix[0][1], 0.0, 0.0),
                vec4(aWorldMatrix[1][0], aWorldMatrix[1][1], 0.0, 0.0),
                vec4(0.0, 0.0, 1.0, 0.0),
                vec4(aWorldMatrix[2][0], aWorldMatrix[2][1], 0.0, 1.0)
            );
            gl_Position = projectionMatrix * viewMatrix * worldMatrix4 * vec4(localPos, 0.0, 1.0);
        }
    `;

const fragment = `#version 300 es
        precision highp float;

        in vec2 vLocalPos;
        in vec2 vRadii;
        in vec4 vColor;
        in vec4 vStrokeColor;
        in float vLineWidth;
        in vec2 vAngles;
        in float vClockwise;

        out vec4 fragColor;

        const float PI = 3.141592653589793;
        const float TWO_PI = 6.283185307179586;

        float mod2pi(float x) {
            return mod(x, TWO_PI);
        }

        float normAngle(float a) {
            a = mod2pi(a);
            return a < 0.0 ? a + TWO_PI : a;
        }

        float arcMask(vec2 p, float start, float end, float clockwise) {
            // Robust sweep computation:
            // When end-start is exactly ±2π, normalizing angles collapses both to 0 and sweep becomes 0.
            // Detect that case via the raw delta before normalization.
            float delta = clockwise > 0.5 ? (start - end) : (end - start);
            float sweep = mod2pi(delta);
            if (sweep <= 1e-6 && abs(delta) > 1e-4) sweep = TWO_PI;
            if (sweep >= TWO_PI - 1e-4) return 1.0;
            if (sweep <= 1e-6) return 0.0;

            float s = normAngle(start);
            float a = normAngle(atan(p.y, p.x));
            float dist = clockwise > 0.5 ? mod2pi(s - a) : mod2pi(a - s);
            return dist <= sweep ? 1.0 : 0.0;
        }

        void main() {
            vec2 radii = max(vRadii, vec2(1e-6));

            // p: pixel space relative to center
            vec2 p = vLocalPos;

            // Ellipse implicit distance approximation (pixel-ish distance)
            vec2 q = p / radii;
            float k = length(q);
            float d = (k - 1.0) * min(radii.x, radii.y);

            float aa = fwidth(d);
            float aaStroke = max(aa, 1.0);

            float lw = clamp(vLineWidth, 0.0, min(radii.x, radii.y));

            float alphaOuter = 1.0 - smoothstep(0.0, aaStroke, d);
            float alphaInner = 1.0 - smoothstep(0.0, aaStroke, d + lw);
            float alphaStrokeMask = max(0.0, alphaOuter - alphaInner);

            float m = arcMask(p, vAngles.x, vAngles.y, vClockwise);
            alphaOuter *= m;
            alphaInner *= m;
            alphaStrokeMask *= m;

            float fillA = vColor.a * alphaInner;
            float strokeA = vStrokeColor.a * alphaStrokeMask;
            float outA = fillA + strokeA;
            if (outA < 1e-6) {
                fragColor = vec4(0.0);
                return;
            }

            vec3 outRgb = (vColor.rgb * fillA + vStrokeColor.rgb * strokeA) / outA;
            fragColor = vec4(outRgb, outA);
        }
    `;

const unitQuad = new Float32Array([
    0, 0,
    1, 0,
    0, 1,

    1, 0,
    1, 1,
    0, 1,
]);

let program: Program | null = null;
let geometry: Geometry | null = null;
let mesh: Mesh | null = null;

// Pre-allocated Float32Arrays for attributes
let positionData = unitQuad;
let aWorldMatrixData = new Float32Array(9);
let aRadiiData = new Float32Array(2);
let aColorData = new Float32Array(4);
let aStrokeColorData = new Float32Array(4);
let aLineWidthData = new Float32Array(1);
let aAnglesData = new Float32Array(2);
let aClockwiseData = new Float32Array(1);

// 单个 Circle/椭圆/圆弧（扇形裁剪）渲染。
// 约定：Transform.worldMatrix 为 3x3 仿射矩阵（包含平移/缩放/旋转/斜切）。
// circle.radius/radiusY 为主/次半径（像素）。
export function renderCircle(gl: WebGL2RenderingContext, camera: Camera, transform: Transform, circle: Circle) {
    if (!circle) return;

    if (!program) {
        program = new Program(gl, {
            vertex,
            fragment,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });

        geometry = new Geometry(gl, {
            position: { data: positionData, size: 2 },
            aWorldMatrix: { data: aWorldMatrixData, size: 9, instanced: 1, usage: gl.DYNAMIC_DRAW },
            aRadii: { data: aRadiiData, size: 2, instanced: 1, usage: gl.DYNAMIC_DRAW },
            aColor: { data: aColorData, size: 4, instanced: 1, usage: gl.DYNAMIC_DRAW },
            aStrokeColor: { data: aStrokeColorData, size: 4, instanced: 1, usage: gl.DYNAMIC_DRAW },
            aLineWidth: { data: aLineWidthData, size: 1, instanced: 1, usage: gl.DYNAMIC_DRAW },
            aAngles: { data: aAnglesData, size: 2, instanced: 1, usage: gl.DYNAMIC_DRAW },
            aClockwise: { data: aClockwiseData, size: 1, instanced: 1, usage: gl.DYNAMIC_DRAW },
        });
        geometry.setInstancedCount(1);

        mesh = new Mesh(gl, { geometry, program, frustumCulled: false });
    }

    const radius = Math.max(0, Number(circle.radius || 0));
    const radiusY = circle.radiusY == null ? radius : Math.max(0, Number(circle.radiusY || 0));

    const alpha = circle.alpha == null ? 1 : Math.max(0, Math.min(1, Number(circle.alpha)));
    const fill = parseColorStyle(circle.fillStyle);
    const stroke = circle.strokeStyle ? parseColorStyle(circle.strokeStyle) : [0, 0, 0, 0];

    const lineWidth = Math.max(0, Number(circle.lineWidth || 0));

    const startAngle = circle.startAngle == null ? 0 : Number(circle.startAngle);
    const endAngle = circle.endAngle == null ? Math.PI * 2 : Number(circle.endAngle);
    const clockwise = circle.clockwise == null ? true : Boolean(circle.clockwise);

    // Update attribute data directly
    aWorldMatrixData.set(transform.worldMatrix);
    aRadiiData[0] = radius;
    aRadiiData[1] = radiusY;
    aColorData[0] = fill[0];
    aColorData[1] = fill[1];
    aColorData[2] = fill[2];
    aColorData[3] = fill[3] * alpha;
    aStrokeColorData[0] = stroke[0];
    aStrokeColorData[1] = stroke[1];
    aStrokeColorData[2] = stroke[2];
    aStrokeColorData[3] = stroke[3] * alpha;
    aLineWidthData[0] = lineWidth;
    aAnglesData[0] = startAngle;
    aAnglesData[1] = endAngle;
    aClockwiseData[0] = clockwise ? 1 : 0;

    // Mark attributes as needing update
    geometry!.attributes.position.needsUpdate = true;
    geometry!.updateAttribute(geometry!.attributes.position);

    geometry!.attributes.aWorldMatrix.needsUpdate = true;
    geometry!.updateAttribute(geometry!.attributes.aWorldMatrix);

    geometry!.attributes.aRadii.needsUpdate = true;
    geometry!.updateAttribute(geometry!.attributes.aRadii);

    geometry!.attributes.aColor.needsUpdate = true;
    geometry!.updateAttribute(geometry!.attributes.aColor);

    geometry!.attributes.aStrokeColor.needsUpdate = true;
    geometry!.updateAttribute(geometry!.attributes.aStrokeColor);

    geometry!.attributes.aLineWidth.needsUpdate = true;
    geometry!.updateAttribute(geometry!.attributes.aLineWidth);

    geometry!.attributes.aAngles.needsUpdate = true;
    geometry!.updateAttribute(geometry!.attributes.aAngles);

    geometry!.attributes.aClockwise.needsUpdate = true;
    geometry!.updateAttribute(geometry!.attributes.aClockwise);

    mesh!.draw({ camera });
}
