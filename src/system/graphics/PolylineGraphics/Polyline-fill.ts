import earcut from 'earcut';
import { Geometry, Mesh, Program, Camera } from '../../../webgl/index';
import type { RGBA } from '../../../utils/color';
import { vec2, type Vec2 } from '../../../utils/vec2';

let polylineFillProgram: Program | null = null;
let geometry: Geometry | null = null;
let mesh: Mesh | null = null;
let lastIndexCount = 0;

function getOrCreatePolylineFillProgram(gl: WebGL2RenderingContext): Program {
	if (polylineFillProgram) return polylineFillProgram;

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

	polylineFillProgram = new Program(gl, {
		vertex,
		fragment,
		transparent: true,
		cullFace: gl.NONE,
		depthTest: false,
		depthWrite: false,
	});

	return polylineFillProgram;
}

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
	aWorldMatrix: Float32Array,
	points: Vec2[],
	fillColor: RGBA,
	alpha: number
) {
	if (points.length < 3) return;

	const fillMesh = buildFillMesh(points);
	if (!fillMesh) return;

	const aColor = new Float32Array([fillColor[0], fillColor[1], fillColor[2], fillColor[3] * alpha]);
	const program = getOrCreatePolylineFillProgram(gl);

	// recreate geometry/mesh if index count changed
	if (!geometry || lastIndexCount !== fillMesh.indices.length) {
		geometry = new Geometry(gl, {
			position: { data: fillMesh.positions, size: 2, usage: gl.DYNAMIC_DRAW },
			aWorldMatrix: { data: aWorldMatrix, size: 9, instanced: 1, usage: gl.DYNAMIC_DRAW },
			aColor: { data: aColor, size: 4, instanced: 1, usage: gl.DYNAMIC_DRAW },
		});
		geometry.setIndex({ data: fillMesh.indices, size: 1 });
		geometry.setInstancedCount(1);

		mesh = new Mesh(gl, { geometry, program, frustumCulled: false });
		lastIndexCount = fillMesh.indices.length;
	} else {
		geometry.attributes.position.data = fillMesh.positions;
		geometry.attributes.position.needsUpdate = true;
		geometry.updateAttribute(geometry.attributes.position);

		geometry.attributes.aWorldMatrix.data = aWorldMatrix;
		geometry.attributes.aWorldMatrix.needsUpdate = true;
		geometry.updateAttribute(geometry.attributes.aWorldMatrix);

		geometry.attributes.aColor.data = aColor;
		geometry.attributes.aColor.needsUpdate = true;
		geometry.updateAttribute(geometry.attributes.aColor);
	}

	mesh!.draw({ camera });
}
