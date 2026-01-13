import { Program, Camera } from '../../../webgl/index';
import { Transform } from '../../../components/Transform';
import { Polyline } from '../../../components/render/Polyline';
import { parseColorStyle, type RGBA } from '../../../utils/color';
import type { Vec2 } from '../../../utils/vec2';
import { renderPolylineFill } from './Polyline-fill';
import { renderPolylineStroke } from './Polyline-stroke';

function createSolidColorProgram(gl: WebGL2RenderingContext) {
	const vertex = `#version 300 es
		precision highp float;

		in vec2 position;
		in mat3 aWorldMatrix;
		in vec4 aColor;

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

	return new Program(gl, {
		vertex,
		fragment,
		transparent: true,
		cullFace: gl.NONE,
		depthTest: false,
		depthWrite: false,
	});
}
// todo 渲染round 和bevel 有问题
export function renderPolyline(gl: WebGL2RenderingContext, camera: Camera, transform: Transform, polyline: Polyline) {
	const pts = polyline.points as Vec2[];
	if (!polyline.render || pts.length < 2) return;

	const alpha = polyline.alpha == null ? 1 : Math.max(0, Math.min(1, Number(polyline.alpha)));
	const hasFill = polyline.fillStyle != null;
	const fill: RGBA | null = hasFill ? parseColorStyle(polyline.fillStyle) : null;
	const hasStroke = polyline.strokeStyle != null;
	const stroke: RGBA | null = hasStroke ? parseColorStyle(polyline.strokeStyle) : null;
	const lineWidth = Math.max(0, Number(polyline.lineWidth || 0));

	const aWorldMatrix = new Float32Array(transform.worldMatrix);
	const program = createSolidColorProgram(gl);

	// Fill: only when fillStyle is explicitly set (not null/undefined)
	if (fill && pts.length >= 3) {
		renderPolylineFill(gl, camera, program, aWorldMatrix, pts, fill, alpha);
	}

	// Stroke: closed only affects whether last->first is connected (and thus uses lineJoin at that point).
	if (stroke && lineWidth > 0) {
		renderPolylineStroke(gl, camera, program, aWorldMatrix, pts, stroke, alpha, lineWidth, !!polyline.closed, polyline.lineJoin);
	}
}
