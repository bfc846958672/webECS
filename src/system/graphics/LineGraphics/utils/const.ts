export type IPoint = [number, number];
export type IVec2 = [number, number];
export type LineJoin = 'round' | 'bevel' | 'miter';

/** @internal */
export const closePointEps = 1e-4;
/** @internal */
export const curveEps = 0.0001;
