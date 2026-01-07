
export function sanitizeSingleLineText(text: unknown): string {
    if (text == null) return '';
    return String(text).replace(/[\u0000-\u001F]/g, ' ');
}
