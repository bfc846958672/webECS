import { Camera } from '../../../webgl/index';
import { Transform } from '../../../components/Transform';
import { Polyline } from '../../../components/render/Polyline';
import { parseColorStyle, type RGBA } from '../../../utils/color';
import type { Vec2 } from '../../../utils/vec2';
import { renderPolylineFill } from './Polyline-fill';
import { renderPolylineStroke } from './Polyline-stroke';
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
	// Fill: only when fillStyle is explicitly set (not null/undefined)
	if (fill && pts.length >= 3) {
		renderPolylineFill(gl, camera, aWorldMatrix, pts, fill, alpha);
	}

	// Stroke: closed only affects whether last->first is connected (and thus uses lineJoin at that point).
	if (stroke && lineWidth > 0) {
		renderPolylineStroke(gl, camera, aWorldMatrix, pts, stroke, alpha, lineWidth, !!polyline.closed, polyline.lineJoin);
	}
}
