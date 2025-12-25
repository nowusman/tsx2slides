/**
 * Gradient Handler Service
 * 
 * Handles CSS gradients by converting them to solid colors or images.
 * PDF and PPTX have limited gradient support, so we provide fallbacks.
 */

import { ContainerInfo, calculatePrecisePosition, PreciseRect } from './positionCalculator';
import { rgbToHex, standardizeColor } from './colorUtils';

export interface GradientResult {
    type: 'solid' | 'image';
    value: string; // hex color for solid, base64 for image
    dominantColor: string; // hex color, always available
    originalGradient: string;
}

export interface GradientColorStop {
    color: string;
    position: number; // 0-1
}

/**
 * Extracts color stops from a CSS gradient string
 */
const parseGradientStops = (gradient: string): GradientColorStop[] => {
    const stops: GradientColorStop[] = [];

    // Match color and optional position
    // e.g., "rgb(255, 0, 0) 0%", "#ff0000", "red 50%"
    const colorPattern = /((?:rgb|rgba|hsl|hsla)\([^)]+\)|#[0-9a-fA-F]{3,8}|\b[a-z]+\b)(?:\s+(\d+(?:\.\d+)?%?))?/gi;

    let match;
    let index = 0;
    const matches: Array<{ color: string; position: number | null }> = [];

    while ((match = colorPattern.exec(gradient)) !== null) {
        const color = match[1];
        let position: number | null = null;

        if (match[2]) {
            position = parseFloat(match[2]) / 100;
        }

        matches.push({ color, position });
        index++;
    }

    // Assign positions to stops without explicit positions
    for (let i = 0; i < matches.length; i++) {
        const m = matches[i];
        let pos = m.position;

        if (pos === null) {
            if (i === 0) {
                pos = 0;
            } else if (i === matches.length - 1) {
                pos = 1;
            } else {
                // Interpolate between previous and next defined positions
                pos = i / (matches.length - 1);
            }
        }

        stops.push({
            color: standardizeColor(m.color),
            position: pos,
        });
    }

    return stops;
};

// normalizeColor removed and replaced by standardizeColor from colorUtils

/**
 * Converts HSL to hex color
 */
const hslToHex = (h: number, s: number, l: number): string => {
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
};

/**
 * Calculates the dominant color from gradient stops
 * Uses weighted average based on stop positions
 */
const calculateDominantColor = (stops: GradientColorStop[]): string => {
    if (stops.length === 0) return '#000000';
    if (stops.length === 1) return stops[0].color;

    let totalR = 0, totalG = 0, totalB = 0;
    let totalWeight = 0;

    for (let i = 0; i < stops.length - 1; i++) {
        const stop1 = stops[i];
        const stop2 = stops[i + 1];
        const weight = stop2.position - stop1.position;

        // Get RGB values for both stops
        const rgb1 = hexToRgb(stop1.color);
        const rgb2 = hexToRgb(stop2.color);

        // Average the colors in this segment
        totalR += ((rgb1.r + rgb2.r) / 2) * weight;
        totalG += ((rgb1.g + rgb2.g) / 2) * weight;
        totalB += ((rgb1.b + rgb2.b) / 2) * weight;
        totalWeight += weight;
    }

    if (totalWeight === 0) return stops[0].color;

    const r = Math.round(totalR / totalWeight).toString(16).padStart(2, '0');
    const g = Math.round(totalG / totalWeight).toString(16).padStart(2, '0');
    const b = Math.round(totalB / totalWeight).toString(16).padStart(2, '0');

    return `#${r}${g}${b}`;
};

/**
 * Converts hex color to RGB components, handling alpha
 */
const hexToRgb = (hex: string): { r: number; g: number; b: number; a: number } => {
    if (!hex) return { r: 0, g: 0, b: 0, a: 0 };

    // Support 3, 4, 6, 8 digit hex
    let r = 0, g = 0, b = 0, a = 1;

    if (hex.startsWith('#')) {
        if (hex.length === 4 || hex.length === 5) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
            if (hex.length === 5) a = parseInt(hex[4] + hex[4], 16) / 255;
        } else if (hex.length === 7 || hex.length === 9) {
            r = parseInt(hex.slice(1, 3), 16);
            g = parseInt(hex.slice(3, 5), 16);
            b = parseInt(hex.slice(5, 7), 16);
            if (hex.length === 9) a = parseInt(hex.slice(7, 9), 16) / 255;
        }
    }

    return { r, g, b, a };
};

/**
 * Renders a gradient to a canvas and returns it as a base64 image
 */
const renderGradientToImage = (
    gradient: string,
    width: number,
    height: number
): string => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(width, 1);
    canvas.height = Math.max(height, 1);

    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Create a temporary element to apply the gradient
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = `
    position: absolute;
    left: -9999px;
    width: ${width}px;
    height: ${height}px;
    background: ${gradient};
  `;
    document.body.appendChild(tempDiv);

    // Draw the element onto the canvas
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    document.body.removeChild(tempDiv);

    return canvas.toDataURL('image/png');
};

/**
 * Checks if a background value contains a gradient
 */
export const isGradient = (background: string): boolean => {
    return background.includes('gradient');
};

/**
 * Extracts the gradient type from a CSS gradient string
 */
export const getGradientType = (gradient: string): 'linear' | 'radial' | 'conic' | null => {
    if (gradient.includes('linear-gradient')) return 'linear';
    if (gradient.includes('radial-gradient')) return 'radial';
    if (gradient.includes('conic-gradient')) return 'conic';
    return null;
};

/**
 * Handles a gradient background, returning either a solid color or image fallback
 */
export const handleGradient = (
    element: HTMLElement,
    styles: CSSStyleDeclaration,
    preferImage: boolean = false
): GradientResult => {
    const bg = styles.backgroundImage;
    const bgColor = styles.backgroundColor;

    // If no gradient, return solid background color
    if (!bg || bg === 'none' || !isGradient(bg)) {
        const color = rgbToHex(bgColor);
        const dominant = color || '#00000000'; // Fully transparent if no color
        return {
            type: 'solid',
            value: dominant,
            dominantColor: dominant,
            originalGradient: '',
        };
    }

    // Parse gradient stops
    const stops = parseGradientStops(bg);
    const dominantColor = calculateDominantColor(stops);

    // If preferImage is true and we have valid dimensions, render to image
    if (preferImage) {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            const imageData = renderGradientToImage(bg, rect.width, rect.height);
            if (imageData) {
                return {
                    type: 'image',
                    value: imageData,
                    dominantColor,
                    originalGradient: bg,
                };
            }
        }
    }

    // Default: return dominant color as solid fallback
    return {
        type: 'solid',
        value: dominantColor,
        dominantColor,
        originalGradient: bg,
    };
};

/**
 * Extracts background information from an element
 */
export const extractBackground = (
    element: HTMLElement,
    styles: CSSStyleDeclaration
): { color: string; hasGradient: boolean; gradientImage?: string } => {
    const result = handleGradient(element, styles, false);

    return {
        color: result.dominantColor,
        hasGradient: result.originalGradient !== '',
        gradientImage: result.type === 'image' ? result.value : undefined,
    };
};

/**
 * Creates a gradient image element for extraction
 */
export const createGradientImage = async (
    element: HTMLElement,
    styles: CSSStyleDeclaration,
    containerInfo: ContainerInfo
): Promise<{
    imageData: string;
    position: PreciseRect;
} | null> => {
    const result = handleGradient(element, styles, true);

    if (result.type !== 'image' || !result.value) {
        return null;
    }

    const position = calculatePrecisePosition(element, containerInfo);

    return {
        imageData: result.value,
        position,
    };
};
