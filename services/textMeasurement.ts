/**
 * Text Measurement Service
 * 
 * Uses the Canvas API for accurate text width and line height measurement.
 * This ensures text positioning is accurate in the exported PDF/PPTX.
 */

import { mapToStandardFont } from './fontMapper';

export interface TextMetrics {
    width: number;
    height: number;
    actualBoundingBoxAscent: number;
    actualBoundingBoxDescent: number;
    fontBoundingBoxAscent: number;
    fontBoundingBoxDescent: number;
}

export interface LineMetrics {
    lineHeight: number;
    ascent: number;
    descent: number;
    capHeight: number;
}

/**
 * TextMeasurer class for accurate text measurement using Canvas API
 */
export class TextMeasurer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private cache: Map<string, TextMetrics> = new Map();

    constructor() {
        this.canvas = document.createElement('canvas');
        const ctx = this.canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D context for text measurement');
        }
        this.ctx = ctx;
    }

    /**
     * Measures text dimensions for a given font configuration
     */
    measure(text: string, fontFamily: string, fontSize: number, fontWeight: 'normal' | 'bold' = 'normal'): TextMetrics {
        const cacheKey = `${text}|${fontFamily}|${fontSize}|${fontWeight}`;

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        // Map to standard font for consistent measurement
        const mappedFont = mapToStandardFont(fontFamily);
        const fontString = `${fontWeight} ${fontSize}px ${mappedFont}`;

        this.ctx.font = fontString;
        const metrics = this.ctx.measureText(text);

        const result: TextMetrics = {
            width: metrics.width,
            height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
            actualBoundingBoxAscent: metrics.actualBoundingBoxAscent,
            actualBoundingBoxDescent: metrics.actualBoundingBoxDescent,
            fontBoundingBoxAscent: metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent,
            fontBoundingBoxDescent: metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent,
        };

        this.cache.set(cacheKey, result);
        return result;
    }

    /**
     * Gets line height metrics for a font
     */
    getLineHeight(fontFamily: string, fontSize: number, fontWeight: 'normal' | 'bold' = 'normal'): LineMetrics {
        // Use typical characters to measure line metrics
        const testChars = 'MgÅ|';
        const metrics = this.measure(testChars, fontFamily, fontSize, fontWeight);

        // Default line height is typically 1.2x font size
        const lineHeight = Math.max(
            metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
            fontSize * 1.2
        );

        // Cap height approximation (height of capital letters)
        const capMetrics = this.measure('M', fontFamily, fontSize, fontWeight);

        return {
            lineHeight,
            ascent: metrics.actualBoundingBoxAscent,
            descent: metrics.actualBoundingBoxDescent,
            capHeight: capMetrics.actualBoundingBoxAscent,
        };
    }

    /**
     * Measures the width of a single line of text
     */
    measureWidth(text: string, fontFamily: string, fontSize: number, fontWeight: 'normal' | 'bold' = 'normal'): number {
        return this.measure(text, fontFamily, fontSize, fontWeight).width;
    }

    /**
     * Calculates how text should be wrapped to fit within a given width
     */
    wrapText(text: string, maxWidth: number, fontFamily: string, fontSize: number, fontWeight: 'normal' | 'bold' = 'normal'): string[] {
        if (!text || maxWidth <= 0) return [];

        const words = text.split(/(\s+)/);
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine + word;
            const testWidth = this.measureWidth(testLine, fontFamily, fontSize, fontWeight);

            if (testWidth > maxWidth && currentLine !== '') {
                lines.push(currentLine.trim());
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }

        if (currentLine.trim()) {
            lines.push(currentLine.trim());
        }

        return lines;
    }

    /**
     * Clears the measurement cache
     */
    clearCache(): void {
        this.cache.clear();
    }
}

// Singleton instance for convenience
let measurerInstance: TextMeasurer | null = null;

/**
 * Gets the singleton TextMeasurer instance
 */
export const getTextMeasurer = (): TextMeasurer => {
    if (!measurerInstance) {
        measurerInstance = new TextMeasurer();
    }
    return measurerInstance;
};

/**
 * Convenience function to measure text width
 */
export const measureTextWidth = (
    text: string,
    fontFamily: string,
    fontSize: number,
    fontWeight: 'normal' | 'bold' = 'normal'
): number => {
    return getTextMeasurer().measureWidth(text, fontFamily, fontSize, fontWeight);
};

/**
 * Convenience function to get line height
 */
export const getLineHeight = (
    fontFamily: string,
    fontSize: number,
    fontWeight: 'normal' | 'bold' = 'normal'
): number => {
    return getTextMeasurer().getLineHeight(fontFamily, fontSize, fontWeight).lineHeight;
};

/**
 * Convenience function to wrap text
 */
export const wrapTextToWidth = (
    text: string,
    maxWidth: number,
    fontFamily: string,
    fontSize: number,
    fontWeight: 'normal' | 'bold' = 'normal'
): string[] => {
    return getTextMeasurer().wrapText(text, maxWidth, fontFamily, fontSize, fontWeight);
};
