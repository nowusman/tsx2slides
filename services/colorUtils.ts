/**
 * Color Utilities
 */

/**
 * Converts any RGB/RGBA color string to Hex (with optional alpha).
 * Returns undefined for fully transparent colors.
 */
export const rgbToHex = (rgb: string | null): string | undefined => {
    if (!rgb || rgb === 'transparent' || rgb === 'inherit' || rgb === 'initial') return undefined;

    // Match rgb/rgba with commas or spaces (modern syntax)
    // rgba(0, 0, 0, 0) or rgb(0 0 0 / 0)
    const match = rgb.match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+))?\s*\)/);

    if (!match) {
        if (rgb.startsWith('#')) {
            // Check for #00000000 etc
            if (rgb.length === 9 && rgb.endsWith('00')) return undefined;
            if (rgb.length === 5 && rgb.endsWith('0')) return undefined;
            return rgb;
        }
        return undefined;
    }

    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);
    const a = match[4] ? parseFloat(match[4]) : 1;

    // If fully transparent, return undefined
    if (a === 0) return undefined;

    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

    // If there's partial transparency, add alpha to hex
    if (a < 1) {
        const alphaHex = Math.round(a * 255).toString(16).padStart(2, '0');
        return `${hex}${alphaHex}`;
    }

    return hex;
};

/**
 * Standardizes a color to a hex string (defaults to black if invalid)
 */
export const standardizeColor = (color: string | null | undefined): string => {
    const hex = rgbToHex(color);
    return hex || '#000000';
};
