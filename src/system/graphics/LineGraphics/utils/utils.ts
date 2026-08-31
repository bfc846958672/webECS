/**
 * 获取 点的方向
 * @param points 点
 * @returns 
 */
export function getOrientationOfPoints(points: number[]): number {
    if (points.length < 6) {  return 1;}

    let area = 0;
    let x1 = points[points.length - 2];
    let y1 = points[points.length - 1];

    for (let i = 0; i < points.length; i += 2) {
        const x2 = points[i];
        const y2 = points[i + 1];

        area += (x2 - x1) * (y2 + y1);
        x1 = x2;
        y1 = y2;
    }

    return area < 0 ? -1 : 1;
}
