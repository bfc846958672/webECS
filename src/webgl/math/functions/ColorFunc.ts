const NAMES: { [key: string]: string } = {
    black: '#000000',
    white: '#ffffff',
    red: '#ff0000',
    green: '#00ff00',
    blue: '#0000ff',
    fuchsia: '#ff00ff',
    cyan: '#00ffff',
    yellow: '#ffff00',
    orange: '#ff8000',
};

export function hexToRGB(hex: string): [number, number, number] {
    if (hex.length === 4) hex = hex[0] + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    const rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!rgb) {
        console.warn(`Unable to convert hex string ${hex} to rgb values`);
        return [0, 0, 0];
    }
    return [parseInt(rgb[1], 16) / 255, parseInt(rgb[2], 16) / 255, parseInt(rgb[3], 16) / 255];
}

export function numberToRGB(num: number): [number, number, number] {
    num = parseInt(num.toString());
    return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}

export function parseColor(color: any, g?: number, b?: number): [number, number, number] {
    // Empty
    if (color === undefined) return [0, 0, 0];

    // Decimal
    if (arguments.length === 3) return [color, g, b] as [number, number, number];

    // Number
    if (!isNaN(color)) return numberToRGB(color);

    // Hex
    if (typeof color === 'string' && color[0] === '#') return hexToRGB(color);

    // Names
    if (typeof color === 'string' && NAMES[color.toLowerCase()]) return hexToRGB(NAMES[color.toLowerCase()]);

    console.warn('Color format not recognised');
    return [0, 0, 0];
}