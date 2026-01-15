import { Geometry, Mesh, Program, type Camera } from '../../../webgl/index';
import type { RGBA } from '../../../utils/color';
import { vec2, type Vec2 } from '../../../utils/vec2';
import { computeInnerJoin, computeSegmentQuad, type SegmentQuad } from './utils';

let programCache: Program | null = null;

function getProgram(gl: WebGL2RenderingContext) {
	if (programCache) return programCache;

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

			mat4 world = mat4(
				vec4(aWorldMatrix[0][0], aWorldMatrix[0][1], 0.0, 0.0),
				vec4(aWorldMatrix[1][0], aWorldMatrix[1][1], 0.0, 0.0),
				vec4(0.0, 0.0, 1.0, 0.0),
				vec4(aWorldMatrix[2][0], aWorldMatrix[2][1], 0.0, 1.0)
			);

			gl_Position = projectionMatrix * viewMatrix * world * vec4(position, 0.0, 1.0);
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

	programCache = new Program(gl, {
		vertex,
		fragment,
		transparent: true,
		cullFace: gl.NONE,
		depthTest: false,
		depthWrite: false,
	});

	return programCache;
}

export function buildStrokeMeshBevel(
	gl: WebGL2RenderingContext,
	camera: Camera,
	aWorldMatrix: Float32Array,
	points: Vec2[],
	strokeColor: RGBA,
	alpha: number,
	lineWidth: number,
	closed: boolean
) {
	if (points.length < 3 || lineWidth <= 0) return;
	const n = points.length;

	const positionsArr: number[] = [];
	const indicesArr: number[] = [];
	// 插入数据顺序要一致，从inner点开始顺时针
	const bevels: Vec2[] = []
	// 插入矩形数据顺序要一致，上左上右下右下左
	const rects: SegmentQuad[] = [];
	const end = closed ? n : n - 1;
	for (let i = 0; i < end; i++) {
		let start = i
		let end = i + 1 === n ? 0 : i + 1;
		rects.push(computeSegmentQuad(points[start], points[end], lineWidth)!);
	}

	const startIndex = closed ? 0 : 1;
	const endIndex = closed ? n : n - 1;
	for (let i = startIndex; i < endIndex; i++) {
		const p0 = i - 1 < 0 ? n - 1 : i - 1;
		const p1 = i;
		const p2 = i + 1 === n ? 0 : i + 1;
		const join = computeInnerJoin(points[p0], points[p1], points[p2], lineWidth);
		const lOffset = rects[i - 1 < 0 ? n - 1 : i - 1];
		const rOffset = rects[i];
		if (join.leftInner === null && join.rightInner === null) { continue }
		if (join.leftInner !== null) {
			bevels.push(join.leftInner, rOffset.rs, lOffset.re);
			lOffset.le = join.leftInner;
			rOffset.ls = join.leftInner;
		} else if (join.rightInner !== null) {
			bevels.push(join.rightInner, lOffset.le, rOffset.ls);
			lOffset.re = join.rightInner;
			rOffset.rs = join.rightInner;
		}
	}

	// ================= GPU 数据构建 =================
	let vertexCount = 0;
	for (let i = 0; i < rects.length; i++) {
		const r = rects[i];
		const base = vertexCount;
		positionsArr.push(
			r.ls[0], r.ls[1],
			r.rs[0], r.rs[1],
			r.re[0], r.re[1],
			r.le[0], r.le[1],
		);

		// 两个三角形
		indicesArr.push(
			base + 0, base + 1, base + 2,
			base + 0, base + 2, base + 3,
		);
		vertexCount += 4;
	}
	// ===== bevel（三角形）=====
	for (let i = 0; i < bevels.length; i += 3) {
		const base = vertexCount; // base = rect 顶点总数 + 已 push bevel 顶点数
		const p0 = bevels[i];
		const p1 = bevels[i + 1];
		const p2 = bevels[i + 2];
		positionsArr.push(
			p0[0], p0[1],
			p1[0], p1[1],
			p2[0], p2[1],
		);
		indicesArr.push(
			base + 0,
			base + 1,
			base + 2
		);
		vertexCount += 3;
	}
	// ================= 创建 Geometry =================
	const posArr = new Float32Array(positionsArr);
	const idxArr = vertexCount >= 2 ** 16 ? new Uint32Array(indicesArr) : new Uint16Array(indicesArr);
	const geometry = new Geometry(gl, {
		position: { data: posArr, size: 2 },
		aWorldMatrix: { data: aWorldMatrix, size: 9, instanced: 1 },
		aColor: {
			data: new Float32Array([
				strokeColor[0],
				strokeColor[1],
				strokeColor[2],
				strokeColor[3] * alpha,
			]),
			size: 4,
			instanced: 1,
		},
	});

	geometry.setIndex({ data: idxArr, size: 1 });
	geometry.setInstancedCount(1);

	const mesh = new Mesh(gl, {
		geometry,
		program: getProgram(gl),
		frustumCulled: false,
	});

	mesh.draw({ camera });
}
