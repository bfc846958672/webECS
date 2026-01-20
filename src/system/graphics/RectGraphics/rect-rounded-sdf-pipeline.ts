import { Geometry, Program, Mesh, Camera } from '../../../webgl/index';
import { Rect } from '../../../components/render/Rect';
import { Transform } from '../../../components/Transform';
import { parseColorStyle } from '../../../utils/color';

const vertex = `#version 300 es
        precision highp float;

        // Unit quad (0..1) in local space
        in vec2 position;

        // Per-instance: x, y, w, h in pixels (top-left origin)
        in vec4 aRect;
        // Per-instance: 2D world transform matrix (column-major)
        in mat3 aWorldMatrix;
        // Per-instance: radius in pixels
        in float aRadius;
        // Per-instance: RGBA (0..1)
        in vec4 aColor;
        // Per-instance: stroke RGBA (0..1)
        in vec4 aStrokeColor;
        // Per-instance: stroke width in pixels
        in float aLineWidth;

        uniform mat4 projectionMatrix;
        uniform mat4 viewMatrix;

        out vec2 vLocalPos;
        out vec2 vSize;
        out float vRadius;
        out vec4 vColor;
        out vec4 vStrokeColor;
        out float vLineWidth;

        void main() {
            vSize = aRect.zw;
            vec2 localPos = position * vSize;
            vLocalPos = localPos;
            vRadius = aRadius;
            vColor = aColor;
            vStrokeColor = aStrokeColor;
            vLineWidth = aLineWidth;

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
        in vec2 vSize;
        in float vRadius;
        in vec4 vColor;
        in vec4 vStrokeColor;
        in float vLineWidth;
        out vec4 fragColor;

        float sdRoundRect(vec2 p, vec2 halfSize, float r) {
            vec2 b = halfSize - vec2(r);
            vec2 q = abs(p) - b;
            return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
        }

        void main() {
            vec2 halfSize = max(0.5 * vSize - vec2(0.5), vec2(0.0));
            float r = min(vRadius, min(halfSize.x, halfSize.y));

            vec2 p = vLocalPos - 0.5 * vSize;
            float d = sdRoundRect(p, halfSize, r);

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
let aRectData = new Float32Array(4);
let aWorldMatrixData = new Float32Array(9);
let aRadiusData = new Float32Array(1);
let aColorData = new Float32Array(4);
let aStrokeColorData = new Float32Array(4);
let aLineWidthData = new Float32Array(1);

export function renderRoundedRects(gl: WebGL2RenderingContext, camera: Camera, transform: Transform, rect: Rect) {
    if (!rect) return;

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
            aRect: { data: aRectData, size: 4, instanced: 1, usage: gl.DYNAMIC_DRAW },
            aWorldMatrix: { data: aWorldMatrixData, size: 9, instanced: 1, usage: gl.DYNAMIC_DRAW },
            aRadius: { data: aRadiusData, size: 1, instanced: 1, usage: gl.DYNAMIC_DRAW },
            aColor: { data: aColorData, size: 4, instanced: 1, usage: gl.DYNAMIC_DRAW },
            aStrokeColor: { data: aStrokeColorData, size: 4, instanced: 1, usage: gl.DYNAMIC_DRAW },
            aLineWidth: { data: aLineWidthData, size: 1, instanced: 1, usage: gl.DYNAMIC_DRAW },
        });
        geometry.setInstancedCount(1);

        mesh = new Mesh(gl, { geometry, program, frustumCulled: false });
    }

    const alpha = rect.alpha == null ? 1 : Math.max(0, Math.min(1, Number(rect.alpha)));
    const radius = Math.max(0, Number(rect.radius || 0));
    const fill = parseColorStyle(rect.fillStyle);
    const stroke = rect.strokeStyle ? parseColorStyle(rect.strokeStyle) : [0, 0, 0, 0];

    // Update attribute data directly
    // positionData is unitQuad, update if needed
    // For example: positionData.set(newPositions);

    aRectData[0] = 0;
    aRectData[1] = 0;
    aRectData[2] = rect.width || 0;
    aRectData[3] = rect.height || 0;

    aWorldMatrixData.set(transform.worldMatrix);

    aRadiusData[0] = radius;

    aColorData[0] = fill[0];
    aColorData[1] = fill[1];
    aColorData[2] = fill[2];
    aColorData[3] = fill[3] * alpha;

    aStrokeColorData[0] = stroke[0];
    aStrokeColorData[1] = stroke[1];
    aStrokeColorData[2] = stroke[2];
    aStrokeColorData[3] = stroke[3] * alpha;

    aLineWidthData[0] = Math.max(0, Number(rect.lineWidth || 0));

    // Mark attributes as needing update
    geometry!.attributes.position.needsUpdate = true;
    geometry!.updateAttribute(geometry!.attributes.position);

    geometry!.attributes.aRect.needsUpdate = true;
    geometry!.updateAttribute(geometry!.attributes.aRect);

    geometry!.attributes.aWorldMatrix.needsUpdate = true;
    geometry!.updateAttribute(geometry!.attributes.aWorldMatrix);

    geometry!.attributes.aRadius.needsUpdate = true;
    geometry!.updateAttribute(geometry!.attributes.aRadius);

    geometry!.attributes.aColor.needsUpdate = true;
    geometry!.updateAttribute(geometry!.attributes.aColor);

    geometry!.attributes.aStrokeColor.needsUpdate = true;
    geometry!.updateAttribute(geometry!.attributes.aStrokeColor);

    geometry!.attributes.aLineWidth.needsUpdate = true;
    geometry!.updateAttribute(geometry!.attributes.aLineWidth);

    mesh!.draw({ camera });
}
