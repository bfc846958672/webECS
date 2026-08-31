import { closePointEps, curveEps } from "./utils/const";
import { Line } from "../../../components/render/tLine";
import { getOrientationOfPoints } from "./utils/utils";
import { round } from "./utils/round";
import { square } from "./utils/square";
const eps2 = curveEps * curveEps;
export function buildLine(
    points: number[],
    lineStyle: Omit<Line, 'points' | 'strokeStyle' | 'alpha' | 'render'>,
    vertices: number[],
    indices: number[],
): void {
    const eps = closePointEps;
    if (points.length === 0) return;
    const style = lineStyle;
    let alignment = style.alignment;
    // 如果线条的对齐方式不是居中对齐，则需要根据点的方向来调整对齐方式
    if (lineStyle.alignment !== 0.5) {
        let orientation = getOrientationOfPoints(points);
        alignment = ((alignment - 0.5) * orientation) + 0.5;
    }

    const firstPoint = [points[0], points[1]];
    const lastPoint = [points.at(-2) as number, points.at(-1) as number];
    const closedShape = lineStyle.closed;
    const closedPath = Math.abs(firstPoint[0] - lastPoint[0]) < eps && Math.abs(firstPoint[1] - lastPoint[1]) < eps;

    if (closedShape) {
        points = [...points];
        // 移除自闭合点
        if (closedPath) {
            points.pop();
            points.pop();
            lastPoint[0] = points.at(-2) as number;
            lastPoint[1] = points.at(-1) as number;
        }
        // 插入辅助中点
        const midPointX = (firstPoint[0] + lastPoint[0]) * 0.5;
        const midPointY = (lastPoint[1] + firstPoint[1]) * 0.5;
        points.unshift(midPointX, midPointY);
        points.push(midPointX, midPointY);
    }
    // 顶点数据
    const verts = vertices;
    const length = points.length / 2;
    let indexCount = points.length;
    const indexStart = verts.length / 2;
    // 计算线条宽度和斜接限制的平方值
    const width = style.width / 2;
    const widthSquared = width * width;
    const miterLimitSquared = style.miterLimit * style.miterLimit;

    let x0 = points[0];
    let y0 = points[1];
    let x1 = points[2];
    let y1 = points[3];
    let x2 = 0;
    let y2 = 0;

    // 计算每个点的法线向量
    let perpX = -(y0 - y1);
    let perpY = x0 - x1;
    let perp1x = 0;
    let perp1y = 0;
    // 计算法线向量的长度，并将其归一化，然后乘以线条宽度
    let dist = Math.sqrt((perpX * perpX) + (perpY * perpY));
    perpX /= dist;
    perpY /= dist;
    perpX *= width;
    perpY *= width;

    // 计算对齐方式
    const ratio = alignment;// 0.5;
    const innerWeight = (1 - ratio) * 2;
    const outerWeight = ratio * 2;

    if (!closedShape) {
        if (style.cap === "round") {
            // 绘制起点圆形原点
            const centerX = x0 - (perpX * (innerWeight - outerWeight) * 0.5)
            const centerY = y0 - (perpY * (innerWeight - outerWeight) * 0.5)
            // 绘制起点圆形弧的起点
            const startX = x0 - (perpX * innerWeight);
            const startY = y0 - (perpY * innerWeight);
            // 绘制终点圆形弧的终点
            const endX = x0 + (perpX * outerWeight);
            const endY = y0 + (perpY * outerWeight);
            indexCount += round(centerX, centerY, startX, startY, endX, endY, verts, false);
        } else if (style.cap === "square") {
            indexCount += square(x0, y0, perpX, perpY, innerWeight, outerWeight, true, verts);
        }
    }



    // 插入起点的顶点数据
    verts.push(x0 - (perpX * innerWeight), y0 - (perpY * innerWeight));
    verts.push(x0 + (perpX * outerWeight), y0 + (perpY * outerWeight));

    for (let i = 1; i < length; i++) {
        x0 = points[(i - 1) * 2];
        y0 = points[((i - 1) * 2) + 1];

        x1 = points[i * 2];
        y1 = points[(i * 2) + 1];

        x2 = points[(i + 1) * 2];
        y2 = points[((i + 1) * 2) + 1];
        // 线段1
        perpX = -(y0 - y1);
        perpY = x0 - x1;
        dist = Math.sqrt((perpX * perpX) + (perpY * perpY));
        perpX /= dist;
        perpY /= dist;
        perpX *= width;
        perpY *= width;
        // 线段2
        perp1x = -(y1 - y2);
        perp1y = x1 - x2;
        dist = Math.sqrt((perp1x * perp1x) + (perp1y * perp1y));
        perp1x /= dist;
        perp1y /= dist;
        perp1x *= width;
        perp1y *= width;

        const dx0 = x1 - x0;
        const dy0 = -(y1 - y0);
        const dx1 = x1 - x2;
        const dy1 = -(y1 - y2);
        // 点乘计算是否大于90度
        const dot = (dx0 * dx1) + (dy0 * dy1);
        // 叉乘计算方向，>0为逆时针，<0为顺时针
        const cross = (dy0 * dx1) - (dy1 * dx0);
        const clockwise = (cross < 0);
        // 如果两条线段几乎平行，则使用近似平行连接
        if (Math.abs(cross) < 0.001 * Math.abs(dot)) {
            indexCount = nearParallelJoin(
                verts,
                x1, y1,
                perpX, perpY,
                perp1x, perp1y,
                innerWeight, outerWeight,
                dot, style, indexCount
            );
            continue;
        }
        /* p[x|y] is the miter point. pDist is the distance between miter point and p1. */
        const c1 = ((-perpX + x0) * (-perpY + y1)) - ((-perpX + x1) * (-perpY + y0));
        const c2 = ((-perp1x + x2) * (-perp1y + y1)) - ((-perp1x + x1) * (-perp1y + y2));
        const px = ((dx0 * c2) - (dx1 * c1)) / cross;
        const py = ((dy1 * c1) - (dy0 * c2)) / cross;

        /* Inner miter point */
        const imx = x1 + ((px - x1) * innerWeight);
        const imy = y1 + ((py - y1) * innerWeight);
        /* Outer miter point */
        const omx = x1 - ((px - x1) * outerWeight);
        const omy = y1 - ((py - y1) * outerWeight);

        /* Is the inside miter point too far away, creating a spike? */
        const smallerInsideSegmentSq = Math.min((dx0 * dx0) + (dy0 * dy0), (dx1 * dx1) + (dy1 * dy1));
        const insideWeight = clockwise ? innerWeight : outerWeight;
        const smallerInsideDiagonalSq = smallerInsideSegmentSq + (insideWeight * insideWeight * widthSquared);

        const pDist = ((px - x1) * (px - x1)) + ((py - y1) * (py - y1));
        const insideMiterOk = pDist <= smallerInsideDiagonalSq;

        if (insideMiterOk) {
            if (style.join === 'bevel' || pDist / widthSquared > miterLimitSquared) {
                indexCount += buildInsideMiterBevel(verts,
                    x1, y1,
                    imx, imy,
                    omx, omy,
                    perpX, perpY,
                    perp1x, perp1y,
                    innerWeight, outerWeight,
                    clockwise,

                );
            } else if (style.join === 'round') {
                indexCount += buildInsideMiterRound(verts,
                    x1, y1,
                    imx, imy,
                    omx, omy,
                    perpX, perpY,
                    perp1x, perp1y,
                    innerWeight, outerWeight,
                    clockwise,
                );
            } else {
                verts.push(imx, imy);
                verts.push(omx, omy);
            }
        } else {
            verts.push(x1 - (perpX * innerWeight), y1 - (perpY * innerWeight)); // first segment's inner vertex
            verts.push(x1 + (perpX * outerWeight), y1 + (perpY * outerWeight)); // first segment's outer vertex
            if (style.join === 'round') {
                indexCount += buildOutsideMiterRound(clockwise, x1, y1, perpX, outerWeight, perpY, perp1x, perp1y, verts, innerWeight);
            }
            else if (style.join === 'miter' && pDist / widthSquared <= miterLimitSquared) {
                indexCount += buildOutsideMiterMiter(clockwise, verts, omx, omy, imx, imy);
            }
            verts.push(x1 - (perp1x * innerWeight), y1 - (perp1y * innerWeight)); // second segment's inner vertex
            verts.push(x1 + (perp1x * outerWeight), y1 + (perp1y * outerWeight)); // second segment's outer vertex
            indexCount += 2;
        }
    }


    x0 = points[(length - 2) * 2];
    y0 = points[((length - 2) * 2) + 1];

    x1 = points[(length - 1) * 2];
    y1 = points[((length - 1) * 2) + 1];

    perpX = -(y0 - y1);
    perpY = x0 - x1;

    dist = Math.sqrt((perpX * perpX) + (perpY * perpY));
    perpX /= dist;
    perpY /= dist;
    perpX *= width;
    perpY *= width;

    verts.push(x1 - (perpX * innerWeight), y1 - (perpY * innerWeight));
    verts.push(x1 + (perpX * outerWeight), y1 + (perpY * outerWeight));

    // 尾部cap处理
    if (!closedShape) {
        if (style.cap === 'round') {
            indexCount += round(
                x1 - (perpX * (innerWeight - outerWeight) * 0.5),
                y1 - (perpY * (innerWeight - outerWeight) * 0.5),
                x1 - (perpX * innerWeight),
                y1 - (perpY * innerWeight),
                x1 + (perpX * outerWeight),
                y1 + (perpY * outerWeight),
                verts,
                false
            ) + 2;
        } else if (style.cap === 'square') {
            indexCount += square(x1, y1, perpX, perpY, innerWeight, outerWeight, false, verts);
        }
    }

    for (let i = indexStart; i < indexCount + indexStart - 2; ++i) {
        x0 = verts[(i * 2)];
        y0 = verts[(i * 2) + 1];

        x1 = verts[(i + 1) * 2];
        y1 = verts[((i + 1) * 2) + 1];

        x2 = verts[(i + 2) * 2];
        y2 = verts[((i + 2) * 2) + 1];

        /* Skip zero area triangles */
        if (Math.abs((x0 * (y1 - y2)) + (x1 * (y2 - y0)) + (x2 * (y0 - y1))) < eps2) { continue; }
        indices.push(i, i + 1, i + 2);
    }
}

function buildOutsideMiterMiter(
    clockwise: boolean,
    verts: number[], omx: number, omy: number, imx: number, imy: number,) {
    let indexCount = 0
    if (clockwise) {
        verts.push(omx, omy); // inner miter point
        verts.push(omx, omy); // inner miter point
    }
    else {
        verts.push(imx, imy); // outer miter point
        verts.push(imx, imy); // outer miter point
    }
    indexCount += 2;
    return indexCount;
}

function buildOutsideMiterRound(
    clockwise: boolean,
    x1: number, y1: number,
    perpX: number, outerWeight: number,
    perpY: number, perp1x: number,
    perp1y: number, verts: number[],
    innerWeight: number
) {
    let indexCount = 0
    if (clockwise) /* arc is outside */ {
        indexCount += round(
            x1, y1,
            x1 + (perpX * outerWeight), y1 + (perpY * outerWeight),
            x1 + (perp1x * outerWeight), y1 + (perp1y * outerWeight),
            verts, true
        ) + 2;
    }
    else /* arc is inside */ {
        indexCount += round(
            x1, y1,
            x1 - (perpX * innerWeight), y1 - (perpY * innerWeight),
            x1 - (perp1x * innerWeight), y1 - (perp1y * innerWeight),
            verts, false
        ) + 2;
    }
    return indexCount;
}

function buildInsideMiterRound(verts: number[],
    x1: number, y1: number,
    imx: number, imy: number,
    omx: number, omy: number,
    perpX: number, perpY: number,
    perp1x: number, perp1y: number,
    innerWeight: number, outerWeight: number,
    clockwise: boolean,
) {
    let indexCount = 0
    if (clockwise) /* arc is outside */ {
        verts.push(imx, imy);
        verts.push(x1 + (perpX * outerWeight), y1 + (perpY * outerWeight));

        indexCount += round(
            x1, y1,
            x1 + (perpX * outerWeight), y1 + (perpY * outerWeight),
            x1 + (perp1x * outerWeight), y1 + (perp1y * outerWeight),
            verts, true
        ) + 4;

        verts.push(imx, imy);
        verts.push(x1 + (perp1x * outerWeight), y1 + (perp1y * outerWeight));
    }
    else /* arc is inside */ {
        verts.push(x1 - (perpX * innerWeight), y1 - (perpY * innerWeight));
        verts.push(omx, omy);

        indexCount += round(
            x1, y1,
            x1 - (perpX * innerWeight), y1 - (perpY * innerWeight),
            x1 - (perp1x * innerWeight), y1 - (perp1y * innerWeight),
            verts, false
        ) + 4;

        verts.push(x1 - (perp1x * innerWeight), y1 - (perp1y * innerWeight));
        verts.push(omx, omy);
    }
    return indexCount;
}

function buildInsideMiterBevel(
    verts: number[],
    x1: number, y1: number,
    imx: number, imy: number,
    omx: number, omy: number,
    perpX: number, perpY: number,
    perp1x: number, perp1y: number,
    innerWeight: number, outerWeight: number,
    clockwise: boolean,
) {
    if (clockwise) {
        /* rotating at inner angle */
        verts.push(imx, imy); // inner miter point
        verts.push(x1 + (perpX * outerWeight), y1 + (perpY * outerWeight)); // first segment's outer vertex
        verts.push(imx, imy); // inner miter point
        verts.push(x1 + (perp1x * outerWeight), y1 + (perp1y * outerWeight)); // second segment's outer vertex
    }
    else {
        /* rotating at outer angle */
        verts.push(x1 - (perpX * innerWeight), y1 - (perpY * innerWeight)); // first segment's inner vertex
        verts.push(omx, omy); // outer miter point
        verts.push(x1 - (perp1x * innerWeight), y1 - (perp1y * innerWeight)); // second segment's outer vertex
        verts.push(omx, omy); // outer miter point
    }
    return 2;
}

/** 平行线连接点处理 */
function nearParallelJoin(
    verts: number[],
    x1: number, y1: number,
    perpX: number, perpY: number,
    perp1x: number, perp1y: number,
    innerWeight: number, outerWeight: number,
    dot: number, style: Omit<Line, "points" | "strokeStyle" | "alpha" | "render">,
    indexCount: number,
) {
    verts.push(x1 - (perpX * innerWeight), y1 - (perpY * innerWeight));
    verts.push(x1 + (perpX * outerWeight), y1 + (perpY * outerWeight));
    if (dot >= 0) {
        if (style.join === 'round') {
            indexCount += round(
                x1, y1,
                x1 - (perpX * innerWeight), y1 - (perpY * innerWeight),
                x1 - (perp1x * innerWeight), y1 - (perp1y * innerWeight),
                verts, false
            ) + 2;
        }
        indexCount += 2;
        verts.push(x1 - (perp1x * outerWeight), y1 - (perp1y * outerWeight));
        verts.push(x1 + (perp1x * innerWeight), y1 + (perp1y * innerWeight));
    }
    return indexCount;
}
