export type Vec2 = [number, number];

export const vec2 = {
	sub(a: Vec2, b: Vec2): Vec2 {
		return [a[0] - b[0], a[1] - b[1]];
	},

	add(a: Vec2, b: Vec2): Vec2 {
		return [a[0] + b[0], a[1] + b[1]];
	},

	mul(a: Vec2, s: number): Vec2 {
		return [a[0] * s, a[1] * s];
	},

	len(a: Vec2): number {
		return Math.hypot(a[0], a[1]);
	},

	normalize(a: Vec2): Vec2 {
		const l = vec2.len(a);
		if (l < 1e-6) return [0, 0];
		return [a[0] / l, a[1] / l];
	},

	perp(a: Vec2): Vec2 {
		return [-a[1], a[0]];
	},

	dot(a: Vec2, b: Vec2): number {
		return a[0] * b[0] + a[1] * b[1];
	},

	cross(a: Vec2, b: Vec2): number {
		return a[0] * b[1] - a[1] * b[0];
	},

	nearlyEqual(a: Vec2, b: Vec2, eps = 1e-6): boolean {
		return Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps;
	},

	/** Intersect infinite lines: p + t*r and q + u*s */
	intersectLines(p: Vec2, r: Vec2, q: Vec2, s: Vec2): Vec2 | null {
		const denom = vec2.cross(r, s);
		if (Math.abs(denom) < 1e-6) return null;
		const qp = vec2.sub(q, p);
		const t = vec2.cross(qp, s) / denom;
		if (!Number.isFinite(t)) return null;
		return vec2.add(p, vec2.mul(r, t));
	},
};
