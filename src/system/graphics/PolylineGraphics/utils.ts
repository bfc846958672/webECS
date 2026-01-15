/* ========= 类型 ========= */
import { vec2, type Vec2 } from '../../../utils/vec2';

export interface InnerResult {
  leftInner: Vec2 | null;
  rightInner: Vec2 | null;
}

/**
 * p0 ---- p1 ---- p2
 * 计算内侧连接点
 */
export function computeInnerJoin(
  p0: Vec2,
  p1: Vec2,
  p2: Vec2,
  strokeWidth: number
): InnerResult {
  const half = strokeWidth * 0.5;

  const v1 = vec2.normalize(vec2.sub(p1, p0));
  const v2 = vec2.normalize(vec2.sub(p2, p1));

  // 叉积判断左右凹
  const cross = v1[0] * v2[1] - v1[1] * v2[0];

  // 几乎共线，不产生 inner join
  if (Math.abs(cross) < 1e-6) {
    return { leftInner: null, rightInner: null };
  }

  if (cross > 0) {
    // ===== 左侧凹 =====
    const n1 = vec2.leftNormal(v1);
    const n2 = vec2.leftNormal(v2);

    const a1 = vec2.add(p1, vec2.mul(n1, half));
    const a2 = vec2.add(p1, vec2.mul(n2, half));

    const inner = vec2.intersectLines(a1, v1, a2, v2);

    return {
      leftInner: inner,
      rightInner: null,
    };
  } else {
    // ===== 右侧凹 =====
    const n1 = vec2.rightNormal(v1);
    const n2 = vec2.rightNormal(v2);

    const a1 = vec2.add(p1, vec2.mul(n1, half));
    const a2 = vec2.add(p1, vec2.mul(n2, half));

    const inner = vec2.intersectLines(a1, v1, a2, v2);

    return {
      leftInner: null,
      rightInner: inner,
    };
  }
}

export interface SegmentQuad {
  ls: Vec2; // leftStart
  le: Vec2; // leftEnd
  rs: Vec2; // rightStart
  re: Vec2; // rightEnd
}
/**
 * 计算一条线段的 stroke 四个顶点
 */
export function computeSegmentQuad(
  p_start: Vec2,
  p_end: Vec2,
  strokeWidth: number
): SegmentQuad | null {
  const v_dir = vec2.normalize(vec2.sub(p_end, p_start));

  // 退化线段
  if (v_dir[0] === 0 && v_dir[1] === 0) {
    console.error('Degenerate segment in computeSegmentQuad');
    return null;
  }

  const half = strokeWidth * 0.5;

  const v_left = vec2.leftNormal(v_dir);
  const v_right = vec2.rightNormal(v_dir);

  const p_ls = vec2.add(p_start, vec2.mul(v_left, half));
  const p_le = vec2.add(p_end, vec2.mul(v_left, half));

  const p_rs = vec2.add(p_start, vec2.mul(v_right, half));
  const p_re = vec2.add(p_end, vec2.mul(v_right, half));

  return {
    ls: p_ls,
    le: p_le,
    rs: p_rs,
    re: p_re,
  };
}