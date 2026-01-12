import earcut from 'earcut';
import { Geometry, Program, Mesh, Camera } from '../../../webgl/index';
import { Transform } from '../../../components/Transform';
import { Polyline } from '../../../components/render/Polyline';
import { parseColorStyle } from '../../../utils/color';
import { vec2, type Vec2 } from '../../../utils/vec2';

function sanitizeStrokePoints(points: Vec2[], closed: boolean): Vec2[] {
	let pts = points;
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

function buildStrokeMeshMiter(points: Vec2[], closed: boolean, lineWidth: number) {
	const n = points.length;
	if (n < 2 || lineWidth <= 0) return null;

	const halfW = lineWidth * 0.5;
	const miterLimit = 4;

	const leftRight: number[] = []; // [lx,ly, rx,ry] per point
	const getPoint = (idx: number) => points[(idx + n) % n];

	for (let i = 0; i < n; i++) {
		let dirPrev: Vec2;
		let dirNext: Vec2;

		if (closed) {
			dirPrev = vec2.normalize(vec2.sub(getPoint(i), getPoint(i - 1)));
			dirNext = vec2.normalize(vec2.sub(getPoint(i + 1), getPoint(i)));
		} else {
			if (i === 0) {
				dirPrev = vec2.normalize(vec2.sub(points[1], points[0]));
				dirNext = dirPrev;
			} else if (i === n - 1) {
				dirPrev = vec2.normalize(vec2.sub(points[n - 1], points[n - 2]));
				dirNext = dirPrev;
			} else {
				dirPrev = vec2.normalize(vec2.sub(points[i], points[i - 1]));
				dirNext = vec2.normalize(vec2.sub(points[i + 1], points[i]));
			}
		}

		const nPrev = vec2.perp(dirPrev);
		const nNext = vec2.perp(dirNext);

		let offset = vec2.mul(nNext, halfW);
		const miter = vec2.normalize(vec2.add(nPrev, nNext));
		const denom = vec2.dot(miter, nNext);
		if (Math.abs(denom) > 1e-6) {
			const miterLen = halfW / denom;
			if (Number.isFinite(miterLen) && Math.abs(miterLen) <= miterLimit * halfW) {
				offset = vec2.mul(miter, miterLen);
			}
		}

		const p = points[i];
		const lpt = vec2.add(p, offset);
		const rpt = vec2.sub(p, offset);
		leftRight.push(lpt[0], lpt[1], rpt[0], rpt[1]);
	}

	const positionsArr: number[] = [];
	for (let i = 0; i < n; i++) {
		const baseIn = i * 4;
		positionsArr.push(leftRight[baseIn + 0], leftRight[baseIn + 1]);
		positionsArr.push(leftRight[baseIn + 2], leftRight[baseIn + 3]);
	}

	const indicesArr: number[] = [];
	const segCount = closed ? n : n - 1;
	for (let i = 0; i < segCount; i++) {
		const j = (i + 1) % n;
		const li = i * 2;
		const ri = i * 2 + 1;
		const lj = j * 2;
		const rj = j * 2 + 1;
		indicesArr.push(li, ri, lj);
		indicesArr.push(lj, ri, rj);
	}

	const vertexCount = positionsArr.length / 2;
	const positions = new Float32Array(positionsArr);
	const useU32 = vertexCount >= 65536;
	type Idx = Uint16Array | Uint32Array;
	const indices: Idx = useU32 ? new Uint32Array(indicesArr) : new Uint16Array(indicesArr);
	return { positions, indices };
}

function buildStrokeMeshBevelOrRound(points: Vec2[], closed: boolean, lineWidth: number, lineJoin: 'bevel' | 'round') {
	const n = points.length;
	if (n < 2 || lineWidth <= 0) return null;

	const halfW = lineWidth * 0.5;
	const eps = 1e-6;
	const miterLimit = 4;

	const segCount = closed ? n : n - 1;
	const segDir: Vec2[] = [];
	for (let i = 0; i < segCount; i++) {
		const p0 = points[i];
		const p1 = points[(i + 1) % n];
		const d = vec2.sub(p1, p0);
		const l = vec2.len(d);
		segDir.push(l < eps ? [1, 0] : ([d[0] / l, d[1] / l] as Vec2));
	}

	const addVertex = (positionsArr: number[], p: Vec2) => {
		const idx = positionsArr.length / 2;
		positionsArr.push(p[0], p[1]);
		return idx;
	};

	const positionsArr: number[] = [];
	const indicesArr: number[] = [];

	// For each segment we store indices of its 4 verts
	const segV: Array<{ sL: number; sR: number; eL: number; eR: number }> = new Array(segCount);
	// For each join point i (interior), remember which side is outer
	const outerIsLeftAt: boolean[] = new Array(n).fill(true);

	const computeJoinAtPoint = (i: number) => {
		const p = points[i];
		if (!closed) {
			if (i === 0) {
				const dir = segDir[0];
				const nn = vec2.perp(dir);
				return { left: vec2.add(p, vec2.mul(nn, halfW)), right: vec2.sub(p, vec2.mul(nn, halfW)) };
			}
			if (i === n - 1) {
				const dir = segDir[segCount - 1];
				const nn = vec2.perp(dir);
				return { left: vec2.add(p, vec2.mul(nn, halfW)), right: vec2.sub(p, vec2.mul(nn, halfW)) };
			}
		}

		const prevSeg = closed ? (i - 1 + segCount) % segCount : i - 1;
		const nextSeg = closed ? i % segCount : i;
		const dirPrev = segDir[prevSeg];
		const dirNext = segDir[nextSeg];
		const nPrev = vec2.perp(dirPrev);
		const nNext = vec2.perp(dirNext);
		const turn = vec2.cross(dirPrev, dirNext);

		if (Math.abs(turn) < 1e-8) {
			return { left: vec2.add(p, vec2.mul(nNext, halfW)), right: vec2.sub(p, vec2.mul(nNext, halfW)) };
		}

		const outerIsLeft = turn > 0;
		outerIsLeftAt[i] = outerIsLeft;
		const outerPrev = outerIsLeft ? vec2.add(p, vec2.mul(nPrev, halfW)) : vec2.sub(p, vec2.mul(nPrev, halfW));
		const outerNext = outerIsLeft ? vec2.add(p, vec2.mul(nNext, halfW)) : vec2.sub(p, vec2.mul(nNext, halfW));

		const innerPrev = outerIsLeft ? vec2.sub(p, vec2.mul(nPrev, halfW)) : vec2.add(p, vec2.mul(nPrev, halfW));
		const innerNext = outerIsLeft ? vec2.sub(p, vec2.mul(nNext, halfW)) : vec2.add(p, vec2.mul(nNext, halfW));
		let inner = vec2.intersectLines(innerPrev, dirPrev, innerNext, dirNext);
		if (!inner) {
			inner = innerNext;
		} else {
			const d = vec2.len(vec2.sub(inner, p));
			if (!Number.isFinite(d) || d > miterLimit * halfW) inner = innerNext;
		}

		// For the segment quads we use: outer point on outer side + inner intersection on inner side.
		// Return a single left/right pair at the join point as a stable shared endpoint.
		if (outerIsLeft) {
			// left is outer, right is inner
			return { left: outerNext, right: inner, outerPrev, outerNext, inner };
		}
		// right is outer, left is inner
		return { left: inner, right: outerNext, outerPrev, outerNext, inner };
	};

	// Precompute join data at each point
	const joinData: any[] = new Array(n);
	for (let i = 0; i < n; i++) joinData[i] = computeJoinAtPoint(i);

	// Build segment quads using join endpoints
	for (let s = 0; s < segCount; s++) {
		const i0 = s;
		const i1 = (s + 1) % n;
		const p0 = points[i0];
		const p1 = points[i1];

		// start endpoint uses this segment's normal unless it's a join (use joinData at i0)
		let sLeft: Vec2;
		let sRight: Vec2;
		if (!closed && s === 0) {
			const nn = vec2.perp(segDir[0]);
			sLeft = vec2.add(p0, vec2.mul(nn, halfW));
			sRight = vec2.sub(p0, vec2.mul(nn, halfW));
		} else {
			// for joins, computeJoinAtPoint returned outerNext on the outer side
			sLeft = joinData[i0].left;
			sRight = joinData[i0].right;
		}

		// end endpoint uses joinData at i1
		let eLeft: Vec2;
		let eRight: Vec2;
		if (!closed && s === segCount - 1) {
			const nn = vec2.perp(segDir[segCount - 1]);
			eLeft = vec2.add(p1, vec2.mul(nn, halfW));
			eRight = vec2.sub(p1, vec2.mul(nn, halfW));
		} else {
			const jd = joinData[i1];
			// jd.left/jd.right is for the outgoing segment; for the incoming segment we need to use outerPrev on outer side.
			const prevSeg = closed ? (i1 - 1 + segCount) % segCount : i1 - 1;
			const nextSeg = closed ? i1 % segCount : i1;
			const dirPrev = segDir[prevSeg];
			const dirNext = segDir[nextSeg];
			const nPrev = vec2.perp(dirPrev);
			const nNext = vec2.perp(dirNext);
			const turn = vec2.cross(dirPrev, dirNext);
			if (Math.abs(turn) < 1e-8) {
				const nn = vec2.perp(segDir[s]);
				eLeft = vec2.add(p1, vec2.mul(nn, halfW));
				eRight = vec2.sub(p1, vec2.mul(nn, halfW));
			} else {
				const outerIsLeft = turn > 0;
				const outerPrev = outerIsLeft ? vec2.add(p1, vec2.mul(nPrev, halfW)) : vec2.sub(p1, vec2.mul(nPrev, halfW));
				const inner = jd.inner as Vec2;
				if (outerIsLeft) {
					eLeft = outerPrev;
					eRight = inner;
				} else {
					eLeft = inner;
					eRight = outerPrev;
				}
			}
		}

		const base = positionsArr.length / 2;
		segV[s] = {
			sL: addVertex(positionsArr, sLeft),
			sR: addVertex(positionsArr, sRight),
			eL: addVertex(positionsArr, eLeft),
			eR: addVertex(positionsArr, eRight),
		};
		indicesArr.push(base + 0, base + 1, base + 2);
		indicesArr.push(base + 2, base + 1, base + 3);
	}

	// Fill joins (outer side) so bevel/round is visible and width is consistent
	const joinStart = closed ? 0 : 1;
	const joinEnd = closed ? n : n - 1;
	for (let i = joinStart; i < joinEnd; i++) {
		const prevSeg = closed ? (i - 1 + segCount) % segCount : i - 1;
		const nextSeg = closed ? i % segCount : i;
		const p = points[i];
		const dirPrev = segDir[prevSeg];
		const dirNext = segDir[nextSeg];
		const turn = vec2.cross(dirPrev, dirNext);
		if (Math.abs(turn) < 1e-8) continue;
		const outerIsLeft = turn > 0;

		const prev = segV[prevSeg];
		const next = segV[nextSeg];
		const outerPrevIdx = outerIsLeft ? prev.eL : prev.eR;
		const innerIdx = outerIsLeft ? prev.eR : prev.eL;
		const outerNextIdx = outerIsLeft ? next.sL : next.sR;

		if (lineJoin === 'bevel') {
			indicesArr.push(outerPrevIdx, outerNextIdx, innerIdx);
			continue;
		}

		// round
		const v0 = vec2.sub([positionsArr[outerPrevIdx * 2], positionsArr[outerPrevIdx * 2 + 1]], p);
		const v1 = vec2.sub([positionsArr[outerNextIdx * 2], positionsArr[outerNextIdx * 2 + 1]], p);
		let a0 = Math.atan2(v0[1], v0[0]);
		let a1 = Math.atan2(v1[1], v1[0]);
		let delta = a1 - a0;
		if (outerIsLeft) {
			if (delta <= 0) delta += Math.PI * 2;
		} else {
			if (delta >= 0) delta -= Math.PI * 2;
		}
		const sweep = Math.abs(delta);
		if (sweep < 1e-4) {
			indicesArr.push(outerPrevIdx, outerNextIdx, innerIdx);
			continue;
		}
		const step = Math.PI / 10;
		const segments = Math.max(2, Math.ceil(sweep / step));
		let prevArcIdx = outerPrevIdx;
		for (let s = 1; s < segments; s++) {
			const t = s / segments;
			const a = a0 + delta * t;
			const curIdx = addVertex(positionsArr, [p[0] + Math.cos(a) * halfW, p[1] + Math.sin(a) * halfW]);
			indicesArr.push(innerIdx, prevArcIdx, curIdx);
			prevArcIdx = curIdx;
		}
		indicesArr.push(innerIdx, prevArcIdx, outerNextIdx);
	}

	const vertexCount = positionsArr.length / 2;
	const positions = new Float32Array(positionsArr);
	const useU32 = vertexCount >= 65536;
	const indices = useU32 ? new Uint32Array(indicesArr) : new Uint16Array(indicesArr);
	return { positions, indices };
}

function buildStrokeMesh(points: Vec2[], closed: boolean, lineWidth: number, lineJoin: Polyline['lineJoin']) {
	const pts = sanitizeStrokePoints(points, closed);
	if (pts.length < 2 || lineWidth <= 0) return null;
	if (lineJoin === 'miter') return buildStrokeMeshMiter(pts, closed, lineWidth);
	return buildStrokeMeshBevelOrRound(pts, closed, lineWidth, lineJoin);
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
	const stroke = parseColorStyle(polyline.strokeStyle);
	const fill = parseColorStyle(polyline.fillStyle ?? (polyline.closed ? polyline.strokeStyle : undefined));
	const lineWidth = Math.max(0, Number(polyline.lineWidth || 0));

	const aWorldMatrix = new Float32Array(transform.worldMatrix);
	const program = createSolidColorProgram(gl);

	// Fill (closed polygon)
	if (polyline.closed && pts.length >= 3) {
		const fillMesh = buildFillMesh(pts);
		if (fillMesh) {
			const aColor = new Float32Array([fill[0], fill[1], fill[2], fill[3] * alpha]);
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
	}

	// Stroke (triangle strip / indexed quads)
	if (polyline.strokeStyle && lineWidth > 0) {
		const strokeMesh = buildStrokeMesh(pts, polyline.closed, lineWidth, polyline.lineJoin);
		if (strokeMesh) {
			const aColor = new Float32Array([stroke[0], stroke[1], stroke[2], stroke[3] * alpha]);
			const geometry = new Geometry(gl, {
				position: { data: strokeMesh.positions, size: 2, usage: gl.DYNAMIC_DRAW },
				aWorldMatrix: { data: aWorldMatrix, size: 9, instanced: 1, usage: gl.DYNAMIC_DRAW },
				aColor: { data: aColor, size: 4, instanced: 1, usage: gl.DYNAMIC_DRAW },
			});
			geometry.setIndex({ data: strokeMesh.indices, size: 1 });
			geometry.setInstancedCount(1);

			const mesh = new Mesh(gl, { geometry, program, frustumCulled: false });
			mesh.draw({ camera });
		}
	}
}
