import earcut from 'earcut';
import { Geometry, Mesh, Program, Camera } from '../../../webgl/index';
import type { RGBA } from '../../../utils/color';
import { vec2, type Vec2 } from '../../../utils/vec2';

function buildFillMesh(points: Vec2[]) {
	if (points.length < 3) return null;

	// earcut expects a flat array, without duplicate end point
	let pts = points;
	if (points.length >= 2 && vec2.nearlyEqual(points[0], points[points.length - 1])) {
		pts = points.slice(0, -1);
	}
	if (pts.length < 3) return null;

	const flat: number[] = [];
	for (const p of pts) {
		flat.push(p[0], p[1]);
	}

	const tri = earcut(flat);
	if (!tri || tri.length < 3) return null;

	const positions = new Float32Array(flat);
	const vertexCount = pts.length;
	const useU32 = vertexCount >= 65536;
	const indices = useU32 ? new Uint32Array(tri) : new Uint16Array(tri);
	return { positions, indices };
}

export function renderPolylineFill(
	gl: WebGL2RenderingContext,
	camera: Camera,
	program: Program,
	aWorldMatrix: Float32Array,
	points: Vec2[],
	fillColor: RGBA,
	alpha: number
) {
	if (points.length < 3) return;

	const fillMesh = buildFillMesh(points);
	if (!fillMesh) return;

	const aColor = new Float32Array([fillColor[0], fillColor[1], fillColor[2], fillColor[3] * alpha]);
	const geometry = new Geometry(gl, {
		position: { data: fillMesh.positions, size: 2, usage: gl.DYNAMIC_DRAW },
		aWorldMatrix: { data: aWorldMatrix, size: 9, instanced: 1, usage: gl.DYNAMIC_DRAW },
		aColor: { data: aColor, size: 4, instanced: 1, usage: gl.DYNAMIC_DRAW },
	});
	geometry.setIndex({ data: fillMesh.indices, size: 1 });
	geometry.setInstancedCount(1);

	const mesh = new Mesh(gl, { geometry, program, frustumCulled: false });
	mesh.draw({ camera });
}
