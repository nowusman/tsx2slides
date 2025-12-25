/**
 * Visual Effects Service
 * 
 * Handles extraction and rendering of borders, shadows, and other visual effects.
 * Provides fallbacks for effects not natively supported in PDF/PPTX.
 */

import { PreciseRect, ContainerInfo, calculatePrecisePosition } from './positionCalculator';
import { rgbToHex } from './colorUtils';

/**
 * Border information extracted from CSS
 */
export interface BorderInfo {
    width: number;        // in px
    style: 'solid' | 'dashed' | 'dotted' | 'double' | 'none';
    color: string;        // hex color
    radius: {
        topLeft: number;
        topRight: number;
        bottomRight: number;
        bottomLeft: number;
    };
}

/**
 * Box shadow information extracted from CSS
 */
export interface ShadowInfo {
    offsetX: number;      // in px
    offsetY: number;      // in px
    blur: number;         // in px
    spread: number;       // in px
    color: string;        // hex color with alpha
    inset: boolean;
}

/**
 * Opacity and visibility information
 */
export interface OpacityInfo {
    opacity: number;      // 0-1
    isVisible: boolean;
    hasTransparency: boolean;
}

/**
 * Transform information
 */
export interface TransformInfo {
    hasTransform: boolean;
    translateX: number;
    translateY: number;
    scaleX: number;
    scaleY: number;
    rotate: number;       // in degrees
}

/**
 * Complete visual effects extracted from an element
 */
export interface VisualEffects {
    border: BorderInfo | null;
    shadow: ShadowInfo | null;
    opacity: OpacityInfo;
    transform: TransformInfo;
    backdropFilter: string | null;
    filter: string | null;
}

// rgbToHex removed and imported from colorUtils

/**
 * Parses a CSS border value
 */
const parseBorderStyle = (style: string): 'solid' | 'dashed' | 'dotted' | 'double' | 'none' => {
    const normalized = style.toLowerCase();
    if (normalized === 'dashed') return 'dashed';
    if (normalized === 'dotted') return 'dotted';
    if (normalized === 'double') return 'double';
    if (normalized === 'none' || normalized === 'hidden') return 'none';
    return 'solid';
};

/**
 * Extracts border information from computed styles
 */
export const extractBorder = (styles: CSSStyleDeclaration): BorderInfo | null => {
    const width = parseFloat(styles.borderTopWidth) || 0;

    // Skip borders that are too thin to be visible
    if (width < 0.5) return null;

    const style = parseBorderStyle(styles.borderTopStyle);
    if (style === 'none') return null;

    // Parse border radius
    const parseRadius = (value: string): number => {
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
    };

    return {
        width,
        style,
        color: rgbToHex(styles.borderTopColor),
        radius: {
            topLeft: parseRadius(styles.borderTopLeftRadius),
            topRight: parseRadius(styles.borderTopRightRadius),
            bottomRight: parseRadius(styles.borderBottomRightRadius),
            bottomLeft: parseRadius(styles.borderBottomLeftRadius),
        },
    };
};

/**
 * Extracts the first box shadow from computed styles
 */
export const extractShadow = (styles: CSSStyleDeclaration): ShadowInfo | null => {
    const boxShadow = styles.boxShadow;

    if (!boxShadow || boxShadow === 'none') return null;

    // Parse box-shadow: [inset] offset-x offset-y [blur] [spread] color
    const inset = boxShadow.includes('inset');
    const shadowValue = boxShadow.replace('inset', '').trim();

    // Extract color first (it can be anywhere in the string)
    const colorMatch = shadowValue.match(/(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}|\b[a-z]+\b)(?:\s|$)/i);
    const color = colorMatch ? (rgbToHex(colorMatch[1]) || '#00000000') : '#00000000';

    // Extract numeric values
    const numericPart = shadowValue.replace(/(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}|\b[a-z]+\b)/gi, '').trim();
    const values = numericPart.split(/\s+/).map(v => parseFloat(v) || 0);

    return {
        offsetX: values[0] || 0,
        offsetY: values[1] || 0,
        blur: values[2] || 0,
        spread: values[3] || 0,
        color,
        inset,
    };
};

/**
 * Extracts opacity information from computed styles
 */
export const extractOpacity = (styles: CSSStyleDeclaration): OpacityInfo => {
    const opacity = parseFloat(styles.opacity);
    const visibility = styles.visibility;
    const display = styles.display;

    const isVisible = display !== 'none' && visibility !== 'hidden' && opacity > 0;

    return {
        opacity: isNaN(opacity) ? 1 : opacity,
        isVisible,
        hasTransparency: opacity < 1,
    };
};

/**
 * Extracts transform information from computed styles
 */
export const extractTransform = (styles: CSSStyleDeclaration): TransformInfo => {
    const transform = styles.transform;

    const result: TransformInfo = {
        hasTransform: false,
        translateX: 0,
        translateY: 0,
        scaleX: 1,
        scaleY: 1,
        rotate: 0,
    };

    if (!transform || transform === 'none') return result;

    result.hasTransform = true;

    // Parse matrix transform
    const matrixMatch = transform.match(/matrix\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/);
    if (matrixMatch) {
        const a = parseFloat(matrixMatch[1]);
        const b = parseFloat(matrixMatch[2]);
        const c = parseFloat(matrixMatch[3]);
        const d = parseFloat(matrixMatch[4]);
        const e = parseFloat(matrixMatch[5]);
        const f = parseFloat(matrixMatch[6]);

        result.translateX = e;
        result.translateY = f;
        result.scaleX = Math.sqrt(a * a + b * b);
        result.scaleY = Math.sqrt(c * c + d * d);
        result.rotate = Math.atan2(b, a) * (180 / Math.PI);
    }

    // Parse individual transforms
    const translateMatch = transform.match(/translate\(\s*([^,]+)(?:,\s*([^)]+))?\)/);
    if (translateMatch) {
        result.translateX = parseFloat(translateMatch[1]) || 0;
        result.translateY = parseFloat(translateMatch[2]) || 0;
    }

    const scaleMatch = transform.match(/scale\(\s*([^,)]+)(?:,\s*([^)]+))?\)/);
    if (scaleMatch) {
        result.scaleX = parseFloat(scaleMatch[1]) || 1;
        result.scaleY = parseFloat(scaleMatch[2]) || result.scaleX;
    }

    const rotateMatch = transform.match(/rotate\(\s*([^)]+)\)/);
    if (rotateMatch) {
        const value = rotateMatch[1];
        if (value.includes('rad')) {
            result.rotate = parseFloat(value) * (180 / Math.PI);
        } else {
            result.rotate = parseFloat(value) || 0;
        }
    }

    return result;
};

/**
 * Extracts all visual effects from an element
 */
export const extractVisualEffects = (element: HTMLElement): VisualEffects => {
    const styles = window.getComputedStyle(element);

    return {
        border: extractBorder(styles),
        shadow: extractShadow(styles),
        opacity: extractOpacity(styles),
        transform: extractTransform(styles),
        backdropFilter: styles.backdropFilter !== 'none' ? styles.backdropFilter : null,
        filter: styles.filter !== 'none' ? styles.filter : null,
    };
};

/**
 * Converts border info to PDF-compatible format
 */
export const borderToPDF = (border: BorderInfo): {
    lineWidth: number;
    lineColor: { r: number; g: number; b: number };
    radius: number;
    dashPattern?: number[];
} => {
    const color = hexToRgb(border.color);

    let dashPattern: number[] | undefined;
    if (border.style === 'dashed') {
        dashPattern = [4, 2];
    } else if (border.style === 'dotted') {
        dashPattern = [1, 1];
    }

    // Use average radius for PDF (doesn't support per-corner radius natively)
    const avgRadius = (
        border.radius.topLeft +
        border.radius.topRight +
        border.radius.bottomRight +
        border.radius.bottomLeft
    ) / 4;

    return {
        lineWidth: border.width * 0.264583, // px to mm (1px ≈ 0.264583mm at 96dpi)
        lineColor: color,
        radius: avgRadius * 0.264583,
        dashPattern,
    };
};

/**
 * Converts border info to PPTX-compatible format
 */
export const borderToPPTX = (border: BorderInfo): {
    pt: number;
    color: string;
    style?: 'dash' | 'dot';
} => {
    let style: 'dash' | 'dot' | undefined;
    if (border.style === 'dashed') {
        style = 'dash';
    } else if (border.style === 'dotted') {
        style = 'dot';
    }

    return {
        pt: border.width * 0.75, // px to pt
        color: border.color.replace('#', ''),
        style,
    };
};

/**
 * Converts shadow info to PDF-compatible format
 * Note: jsPDF doesn't natively support shadows, so this returns parameters
 * that can be used to simulate a shadow with a separate shape
 */
export const shadowToPDF = (shadow: ShadowInfo, elementRect: PreciseRect): {
    x: number;
    y: number;
    width: number;
    height: number;
    color: { r: number; g: number; b: number; a: number };
    blur: number;
} | null => {
    if (shadow.inset) return null; // Inset shadows not supported

    const color = hexToRgba(shadow.color);

    return {
        x: elementRect.x + shadow.offsetX,
        y: elementRect.y + shadow.offsetY,
        width: elementRect.width + shadow.spread * 2,
        height: elementRect.height + shadow.spread * 2,
        color,
        blur: shadow.blur,
    };
};

/**
 * Extracts RGBA values from a hex color
 */
const hexToRgba = (hex: string): { r: number; g: number; b: number; a: number } => {
    const rgb = hexToRgb(hex);
    let a = 1;

    // Check for alpha in hex
    if (hex.length === 9) {
        a = parseInt(hex.slice(7, 9), 16) / 255;
    }

    return { ...rgb, a };
};

/**
 * Converts hex color to RGB components
 */
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    if (!hex) return { r: 0, g: 0, b: 0 };

    let r = 0, g = 0, b = 0;

    if (hex.startsWith('#')) {
        if (hex.length === 4 || hex.length === 5) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length === 7 || hex.length === 9) {
            r = parseInt(hex.slice(1, 3), 16);
            g = parseInt(hex.slice(3, 5), 16);
            b = parseInt(hex.slice(5, 7), 16);
        }
    }

    return { r, g, b };
};

/**
 * Determines if visual effects should be rendered
 */
export const shouldRenderEffects = (effects: VisualEffects): boolean => {
    return effects.opacity.isVisible && (
        effects.border !== null ||
        effects.shadow !== null ||
        effects.opacity.hasTransparency
    );
};

/**
 * Gets the effective border radius in pixels
 */
export const getEffectiveRadius = (border: BorderInfo | null): number => {
    if (!border) return 0;

    const { topLeft, topRight, bottomRight, bottomLeft } = border.radius;
    return Math.max(topLeft, topRight, bottomRight, bottomLeft);
};
