import type { IFont, MsdfFontJson, TextBaselineName } from '../../../interface/font';
import { sanitizeSingleLineText } from '../../../utils/string';

import { FontDesignBox } from './box/FontDesignBox';
import { InlineLayoutBox } from './box/InlineLayoutBox';

type MsdfGlyph = MsdfFontJson['glyphs'][number];
type MsdfKerningPair = NonNullable<MsdfFontJson['kerning']>[number];


export class FontTextCalculator {
    readonly font: MsdfFontJson;
    readonly images: HTMLImageElement[];
    readonly text: string;
    readonly sizePx: number;

    readonly scale: number;
    readonly width: number;
    readonly quadCount: number;

    readonly designBox: FontDesignBox;
    readonly inlineBox: InlineLayoutBox;

    private readonly glyphs: Map<number, MsdfGlyph>;
    private readonly kerning: Map<number, Map<number, number>>;

    constructor(fontWrap: IFont, textComp: { text: unknown; size: unknown }) {
        this.font = fontWrap.font;
        this.images = fontWrap.images;
        this.text = sanitizeSingleLineText(textComp.text);
        this.sizePx = Math.max(0, Number(textComp.size || 0));

        this.glyphs = this.parseMsdfGlyphs(this.font);
        this.kerning = this.buildKerningMap(this.font.kerning);
        this.scale = this.computeMsdfDesignScale(this.font, this.sizePx);

        const { width, quads } = this.countWidthAndQuads();
        this.width = width;
        this.quadCount = quads;

        this.designBox = FontDesignBox.fromFont(this.font, this.width, this.scale);
        this.inlineBox = InlineLayoutBox.fromFont(this.font, this.width, this.scale);
    }

    private countWidthAndQuads(): { width: number; quads: number } {
        const whitespace = /\s/;

        const space = this.glyphs.get(32);
        const spaceAdvance = Number.isFinite(space?.advance) ? (space!.advance as number) : 0;

        let width = 0;
        let quads = 0;
        let prev = -1;
        for (const ch of this.text) {
            const code = ch.codePointAt(0) ?? -1;
            const g = this.glyphs.get(code);

            if (!g) {
                width += this.sizePx;
                prev = code;
                continue;
            }

            const adv = Number.isFinite(g.advance) ? (g.advance as number) : spaceAdvance;
            const kern = prev >= 0 && code >= 0 ? this._getKerningAdvance(this.kerning, prev, code) : 0;

            if (!whitespace.test(ch) && g.planeBounds && g.atlasBounds) quads++;

            prev = code;
            width += (adv + kern) * this.scale;
        }
        return { width, quads };
    }

    getGlyph(unicode: number): MsdfGlyph | undefined {
        return this.glyphs.get(unicode);
    }

    getKerningAdvance(left: number, right: number): number {
        return this._getKerningAdvance(this.kerning, left, right);
    }

    getBaselineLocalY(baseline: TextBaselineName): number {
        if (baseline === 'top') return this.inlineBox.topY;
        if (baseline === 'middle') return this.inlineBox.middleY;
        if (baseline === 'bottom') return this.inlineBox.bottomY;
        if (baseline === 'ideographic') return this.designBox.ideographicBaselineY;
        return 0; // alphabetic
    }
    private parseMsdfGlyphs(font: MsdfFontJson): Map<number, MsdfGlyph> {
        const glyphs = new Map<number, MsdfGlyph>();
        for (const g of font?.glyphs || []) glyphs.set(g.unicode, g);
        return glyphs;
    }
    private buildKerningMap(pairs: MsdfKerningPair[] | undefined): Map<number, Map<number, number>> {
        const map = new Map<number, Map<number, number>>();
        if (!Array.isArray(pairs)) return map;
        for (const k of pairs) {
            const left = (k as any).unicode1 ?? (k as any).left;
            const right = (k as any).unicode2 ?? (k as any).right;
            const adv = (k as any).advance;
            if (!Number.isFinite(left) || !Number.isFinite(right) || !Number.isFinite(adv)) continue;
            const inner = map.get(left) ?? new Map<number, number>();
            inner.set(right, adv);
            map.set(left, inner);
        }
        return map;
    }
    private computeMsdfDesignScale(font: MsdfFontJson, sizePx: number): number {
        const em = font?.metrics?.emSize || 1;
        return sizePx / em;
    }

    private _getKerningAdvance(kerning: Map<number, Map<number, number>>, left: number, right: number): number {
        return kerning.get(left)?.get(right) ?? 0;
    }


}
