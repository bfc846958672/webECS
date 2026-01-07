export class TextureRenderBox {
    constructor(
        public minX: number,
        public minY: number,
        public maxX: number,
        public maxY: number
    ) {}

    static fromPositions(position: Float32Array): TextureRenderBox | null {
        if (!position || position.length < 6) return null;

        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        // position: [x,y,z,...]
        for (let i = 0; i + 2 < position.length; i += 3) {
            const x = position[i];
            const y = position[i + 1];
            if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }

        if (!Number.isFinite(minX)) return null;
        return new TextureRenderBox(minX, minY, maxX, maxY);
    }
}
