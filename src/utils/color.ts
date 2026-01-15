export type RGBA = [number, number, number, number];

export function clamp01(v: number): number {
	return Math.max(0, Math.min(1, v));
}

export const RGBA_WHITE: RGBA = [1, 1, 1, 1];
export const RGBA_BLACK: RGBA = [0, 0, 0, 1];

function copyRgba(c: RGBA): RGBA {
	return [c[0], c[1], c[2], c[3]];
}

function parseColorStyleImpl(style: unknown, defaultColor: RGBA, arrayDefault: RGBA): RGBA {
	if (style == null) return copyRgba(defaultColor);

	if (Array.isArray(style)) {
		const r = style.length > 0 ? Number(style[0]) : arrayDefault[0];
		const g = style.length > 1 ? Number(style[1]) : arrayDefault[1];
		const b = style.length > 2 ? Number(style[2]) : arrayDefault[2];
		const a = style.length > 3 ? Number(style[3]) : arrayDefault[3];
		return [clamp01(r), clamp01(g), clamp01(b), clamp01(a)];
	}

	if (typeof style !== 'string') return copyRgba(defaultColor);
	const s = style.trim();
	if (!s) return copyRgba(defaultColor);

	if (s.startsWith('#')) {
		const hex = s.slice(1);
		if (hex.length === 3 || hex.length === 4) {
			// #rgb or #rgba
			const rHex = hex[0] + hex[0];
			const gHex = hex[1] + hex[1];
			const bHex = hex[2] + hex[2];
			const aHex = hex.length === 4 ? hex[3] + hex[3] : 'ff';
			const r = parseInt(rHex, 16) / 255;
			const g = parseInt(gHex, 16) / 255;
			const b = parseInt(bHex, 16) / 255;
			const a = parseInt(aHex, 16) / 255;
			return [clamp01(r), clamp01(g), clamp01(b), clamp01(a)];
		}
		if (hex.length === 6 || hex.length === 8) {
			const r = parseInt(hex.slice(0, 2), 16) / 255;
			const g = parseInt(hex.slice(2, 4), 16) / 255;
			const b = parseInt(hex.slice(4, 6), 16) / 255;
			const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
			return [clamp01(r), clamp01(g), clamp01(b), clamp01(a)];
		}
	}

	const m = s.match(
		/^rgba\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)\s*$/i
	);
	if (m) {
		const r = clamp01(Number(m[1]) / 255);
		const g = clamp01(Number(m[2]) / 255);
		const b = clamp01(Number(m[3]) / 255);
		const a = clamp01(Number(m[4]));
		return [r, g, b, a];
	}

	return copyRgba(defaultColor);
}

/** Default white fallback: [1,1,1,1] */
export function parseColorStyle(style: unknown): RGBA {
	return parseColorStyleImpl(style, RGBA_WHITE, RGBA_WHITE);
}

/** Default black fallback: [0,0,0,1] */
export function parseColorStyleBlack(style: unknown): RGBA {
	return parseColorStyleImpl(style, RGBA_BLACK, RGBA_BLACK);
}
