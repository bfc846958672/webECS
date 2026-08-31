export function round(
    // 圆心
    centerX: number,
    centerY: number,
    // 起点
    startX: number,
    startY: number,
    // 终点
    endX: number,
    endY: number,
    verts: number[],
    clockwise: boolean,
): number {
    let angle0 = Math.atan2(startX - centerX, startY - centerY);
    let angle1 = Math.atan2(endX - centerX, endY - centerY);

    if (clockwise && angle0 < angle1) { angle0 += Math.PI * 2; }
    else if (!clockwise && angle0 > angle1) { angle1 += Math.PI * 2; }

    const angleDiff = angle1 - angle0;
    const absAngleDiff = Math.abs(angleDiff);

    const dx = startX - centerX;
    const dy = startY - centerY;
    const radius = Math.sqrt(dx * dx + dy * dy);
    const segCount = ((15 * absAngleDiff * Math.sqrt(radius) / Math.PI) >> 0) + 1;
    const angleInc = angleDiff / segCount;
    const startAngle = angle0 + angleInc;

    if (clockwise) {
        // C, S
        verts.push(centerX, centerY, startX, startY);
        for (let i = 1, angle = startAngle; i < segCount; i++, angle += angleInc) {
            const px = centerX + Math.sin(angle) * radius;
            const py = centerY + Math.cos(angle) * radius;
            // C, P
            verts.push(centerX, centerY, px, py);
        }
        // C, E
        verts.push(centerX, centerY, endX, endY);
    } else {
        // S, C
        verts.push(startX, startY, centerX, centerY);
        for (let i = 1, angle = startAngle; i < segCount; i++, angle += angleInc) {
            const px = centerX + Math.sin(angle) * radius;
            const py = centerY + Math.cos(angle) * radius;
            // P, C
            verts.push(px, py, centerX, centerY);
        }
        // E, C
        verts.push(endX, endY, centerX, centerY);
    }
    return segCount * 2;
}