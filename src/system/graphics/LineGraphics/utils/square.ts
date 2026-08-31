/**
 * 
 * @param x 坐标点的x
 * @param y 坐标点的y
 * @param nx 法向量的x
 * @param ny 法向量的y
 * @param innerWeight 
 * @param outerWeight 
 * @param clockwise 顺时针方向
 * @param verts 顶点数组
 */
export function square(
    x: number,
    y: number,
    nx: number,
    ny: number,
    innerWeight: number,
    outerWeight: number,
    clockwise: boolean, /* rotation for square (true at left end, false at right end) */
    verts: Array<number>
): number {
    // 从 (x,y) 偏移得到线宽两侧的点
    const ix = x - (nx * innerWeight);
    const iy = y - (ny * innerWeight);
    const ox = x + (nx * outerWeight);
    const oy = y + (ny * outerWeight);
    // 沿线方向的延伸向量， 基于法线垂直
    let exx;
    let eyy;
    if (clockwise) {
        exx = ny;
        eyy = -nx;
    } else {
        exx = -ny;
        eyy = nx;
    }
    // 基于延伸向量计算square 外的两个点
    verts.push(ix + exx, iy + eyy);
    verts.push(ox + exx, oy + eyy);
    return 2;
}