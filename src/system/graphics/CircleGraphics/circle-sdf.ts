import { Geometry, Program, Mesh, Camera } from '../../../webgl/index';
import { Circle } from '../../../components/render/Circle';
import { Transform } from '../../../components/Transform';

function clamp01(v: number): number {
    return Math.max(0, Math.min(1, v));
}

function parseColorStyle(style: string | number[]): [number, number, number, number] {
    // 支持：
    // - [r,g,b,a] (0..1)
    // - "#RRGGBB" / "#RRGGBBAA"
    // - "rgba(r,g,b,a)" 其中 r/g/b 0..255, a 0..1
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

// 单个 Circle/椭圆/圆弧（扇形裁剪）渲染。
// 约定：Transform.worldMatrix 为 3x3 仿射矩阵（包含平移/缩放/旋转/斜切）。
// circle.radius/radiusY 为主/次半径（像素）。
export function renderCircle(gl: WebGL2RenderingContext, camera: Camera, transform: Transform, circle: Circle) {
    if (!circle) return;

    const radius = Math.max(0, Number(circle.radius || 0));
    const radiusY = circle.radiusY == null ? radius : Math.max(0, Number(circle.radiusY || 0));

    const alpha = circle.alpha == null ? 1 : Math.max(0, Math.min(1, Number(circle.alpha)));
    const fill = parseColorStyle(circle.fillStyle);
    const stroke = circle.strokeStyle ? parseColorStyle(circle.strokeStyle) : [0, 0, 0, 0];

    const lineWidth = Math.max(0, Number(circle.lineWidth || 0));

    const startAngle = circle.startAngle == null ? 0 : Number(circle.startAngle);
    const endAngle = circle.endAngle == null ? Math.PI * 2 : Number(circle.endAngle);
    const clockwise = circle.clockwise == null ? true : Boolean(circle.clockwise);

    // Instanced attribute layout（便于后期直接扩容批处理）：
    const aWorldMatrix = new Float32Array(transform.worldMatrix);
    const aRadii = new Float32Array([radius, radiusY]);
    const aColor = new Float32Array([fill[0], fill[1], fill[2], fill[3] * alpha]);
    const aStrokeColor = new Float32Array([stroke[0], stroke[1], stroke[2], stroke[3] * alpha]);
    const aLineWidth = new Float32Array([lineWidth]);
    const aAngles = new Float32Array([startAngle, endAngle]);
    const aClockwise = new Float32Array([clockwise ? 1 : 0]);

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
            float s = normAngle(start);
            float e = normAngle(end);

            float sweep = clockwise > 0.5 ? mod2pi(s - e) : mod2pi(e - s);
            if (sweep >= TWO_PI - 1e-4) return 1.0;
            if (sweep <= 1e-6) return 0.0;

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

    const program = new Program(gl, {
        vertex,
        fragment,
        transparent: true,
        depthTest: false,
        depthWrite: false,
    });

    const unitQuad = new Float32Array([
        0, 0,
        1, 0,
        0, 1,

        1, 0,
        1, 1,
        0, 1,
    ]);

    const geometry = new Geometry(gl, {
        position: { data: unitQuad, size: 2 },

        aWorldMatrix: { data: aWorldMatrix, size: 9, instanced: 1, usage: gl.DYNAMIC_DRAW },
        aRadii: { data: aRadii, size: 2, instanced: 1, usage: gl.DYNAMIC_DRAW },
        aColor: { data: aColor, size: 4, instanced: 1, usage: gl.DYNAMIC_DRAW },
        aStrokeColor: { data: aStrokeColor, size: 4, instanced: 1, usage: gl.DYNAMIC_DRAW },
        aLineWidth: { data: aLineWidth, size: 1, instanced: 1, usage: gl.DYNAMIC_DRAW },
        aAngles: { data: aAngles, size: 2, instanced: 1, usage: gl.DYNAMIC_DRAW },
        aClockwise: { data: aClockwise, size: 1, instanced: 1, usage: gl.DYNAMIC_DRAW },
    });
    geometry.setInstancedCount(1);

    const mesh = new Mesh(gl, { geometry, program, frustumCulled: false });
    mesh.draw({ camera });
}
