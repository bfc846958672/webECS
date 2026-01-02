import { Geometry, Program, Mesh, Camera } from '../../../webgl/index';
import { Rect } from '../../../components/render/Rect';
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

export function renderSolidRects(gl: WebGL2RenderingContext, camera: Camera, transform: Transform, rect: Rect) {
    const alpha = rect.alpha == null ? 1 : Math.max(0, Math.min(1, Number(rect.alpha)));
    const fill = parseColorStyle(rect.fillStyle);
    const stroke = rect.strokeStyle ? parseColorStyle(rect.strokeStyle) : [0, 0, 0, 0];

    const aRect = new Float32Array([transform.x || 0, transform.y || 0, rect.width || 0, rect.height || 0]);
    const aColor = new Float32Array([fill[0], fill[1], fill[2], fill[3] * alpha]);
    const aStrokeColor = new Float32Array([stroke[0], stroke[1], stroke[2], stroke[3] * alpha]);
    const aLineWidth = new Float32Array([Math.max(0, Number(rect.lineWidth || 0))]);
    const vertex = `#version 300 es
        precision highp float;

        // Unit quad (0..1) in local space
        in vec2 position;

        // Per-instance: x, y, w, h in pixels (top-left origin)
        in vec4 aRect;
        // Per-instance: RGBA (0..1)
        in vec4 aColor;
        // Per-instance: stroke RGBA (0..1)
        in vec4 aStrokeColor;
        // Per-instance: stroke width in pixels
        in float aLineWidth;

        uniform mat4 projectionMatrix;
        uniform mat4 viewMatrix;

        out vec2 vLocal;
        out vec2 vSize;
        out vec4 vColor;
        out vec4 vStrokeColor;
        out float vLineWidth;

        void main() {
            vLocal = position;
            vSize = aRect.zw;
            vColor = aColor;
            vStrokeColor = aStrokeColor;
            vLineWidth = aLineWidth;
            vec2 worldPos = aRect.xy + position * aRect.zw;
            gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 0.0, 1.0);
        }
    `;

    const fragment = `#version 300 es
        precision highp float;

        in vec2 vLocal;
        in vec2 vSize;
        in vec4 vColor;
        in vec4 vStrokeColor;
        in float vLineWidth;
        out vec4 fragColor;

        float sdBox(vec2 p, vec2 halfSize) {
            vec2 q = abs(p) - halfSize;
            return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
        }

        void main() {
            vec2 halfSize = max(0.5 * vSize - vec2(0.5), vec2(0.0));
            vec2 p = (vLocal - 0.5) * vSize;
            float d = sdBox(p, halfSize);

            float aa = fwidth(d);
            float lw = clamp(vLineWidth, 0.0, min(halfSize.x, halfSize.y));
            float aaStroke = max(aa, 1.0);

            float alphaOuter = 1.0 - smoothstep(0.0, aaStroke, d);
            float alphaInner = 1.0 - smoothstep(0.0, aaStroke, d + lw);
            float alphaStrokeMask = max(0.0, alphaOuter - alphaInner);

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
        // cullFace: gl.BACK,
        // frontFace: gl.CW,
        // depthFunc: gl.LEQUAL,
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
        aRect: { data: aRect, size: 4, instanced: 1, usage: gl.DYNAMIC_DRAW },
        aColor: { data: aColor, size: 4, instanced: 1, usage: gl.DYNAMIC_DRAW },
        aStrokeColor: { data: aStrokeColor, size: 4, instanced: 1, usage: gl.DYNAMIC_DRAW },
        aLineWidth: { data: aLineWidth, size: 1, instanced: 1, usage: gl.DYNAMIC_DRAW },
    });

    const mesh = new Mesh(gl, { geometry, program, });
    mesh.draw({ camera });
}