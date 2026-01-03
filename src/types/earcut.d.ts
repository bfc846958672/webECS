declare module 'earcut' {
  export default function earcut(
    vertices: number[] | Float32Array | Float64Array,
    holes?: number[] | null,
    dimensions?: number
  ): number[];
}
