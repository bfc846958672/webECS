import type { Camera } from '../../../webgl/index';
import type { RGBA } from '../../../utils/color';
import { vec2, type Vec2 } from '../../../utils/vec2';
import type { Polyline } from '../../../components/render/Polyline';
import { buildStrokeMeshMiter } from './Polyline-stroke-miter';
import { buildStrokeMeshBevel } from './Polyline-stroke-bevel';
import { buildStrokeMeshRound } from './Polyline-stroke-round';
import { buildStrokeMeshDefault } from './Polyline-stroke-default';

function sanitizeStrokePoints(points: Vec2[], closed: boolean): Vec2[] {
	let pts = [...points];
	if (closed && pts.length >= 2 && vec2.nearlyEqual(pts[0], pts[pts.length - 1])) {
		pts = pts.slice(0, -1);
	}
	if (pts.length < 2) return pts;

	const out: Vec2[] = [];
	for (const p of pts) {
		if (out.length === 0 || !vec2.nearlyEqual(out[out.length - 1], p)) out.push(p);
	}
	if (closed && out.length >= 2 && vec2.nearlyEqual(out[0], out[out.length - 1])) out.pop();
	return out;
}

export function renderPolylineStroke(
	gl: WebGL2RenderingContext,
	camera: Camera,
	aWorldMatrix: Float32Array,
	points: Vec2[],
	strokeColor: RGBA,
	alpha: number,
	lineWidth: number,
	closed: boolean,
	lineJoin: Polyline['lineJoin']
) {
	if (lineWidth <= 0) return;
	if (points.length < 2) return;
	// debugger;
	const pts = sanitizeStrokePoints(points, closed);
	if (pts.length < 2) return;

	if (pts.length == 2 || lineJoin === 'default') {
		buildStrokeMeshDefault(gl, camera, aWorldMatrix, pts, strokeColor, alpha, lineWidth, closed);
	}
	else if (lineJoin === 'miter') {
		buildStrokeMeshMiter(gl, camera, aWorldMatrix, pts, strokeColor, alpha, lineWidth, closed);
	}
	else if (lineJoin === 'bevel') {
		// buildStrokeMeshDefault(gl, camera, aWorldMatrix, pts, strokeColor, alpha, lineWidth, closed);

		buildStrokeMeshBevel(gl, camera, aWorldMatrix, pts, strokeColor, alpha, lineWidth, closed);
	}
	else if (lineJoin === 'round') {
		buildStrokeMeshRound(gl, camera, aWorldMatrix, pts, strokeColor, alpha, lineWidth, closed);
	}
}