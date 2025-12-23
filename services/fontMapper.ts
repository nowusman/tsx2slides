/**
 * Font Mapper Service
 * 
 * Maps any font to standard web-safe fonts to avoid missing glyphs.
 * Preserves font weight and style while using reliable system fonts.
 */

// Mapping of common fonts to their standard equivalents
const FONT_MAP: Record<string, string> = {
    // Sans-serif fonts
    'Inter': 'Arial',
    'Roboto': 'Arial',
    'Open Sans': 'Arial',
    'Lato': 'Arial',
    'Montserrat': 'Arial',
    'Nunito': 'Arial',
    'Poppins': 'Arial',
    'Source Sans Pro': 'Arial',
    'Ubuntu': 'Arial',
    'Noto Sans': 'Arial',
    'Raleway': 'Arial',
    'Work Sans': 'Arial',
    'Manrope': 'Arial',
    'DM Sans': 'Arial',
    'Plus Jakarta Sans': 'Arial',
    'Outfit': 'Arial',
    'Figtree': 'Arial',
    'Geist': 'Arial',
    'Helvetica Neue': 'Helvetica',
    'SF Pro': 'Arial',
    'SF Pro Display': 'Arial',
    'SF Pro Text': 'Arial',
    'system-ui': 'Arial',
    '-apple-system': 'Arial',
    'BlinkMacSystemFont': 'Arial',
    'Segoe UI': 'Arial',
    'Tahoma': 'Arial',
    'Verdana': 'Verdana',
    'Trebuchet MS': 'Trebuchet MS',

    // Serif fonts
    'Georgia': 'Georgia',
    'Times New Roman': 'Times New Roman',
    'Times': 'Times New Roman',
    'Merriweather': 'Georgia',
    'Playfair Display': 'Georgia',
    'Lora': 'Georgia',
    'Libre Baskerville': 'Georgia',
    'Source Serif Pro': 'Georgia',
    'Noto Serif': 'Times New Roman',
    'PT Serif': 'Times New Roman',
    'Crimson Text': 'Georgia',
    'EB Garamond': 'Georgia',
    'Cormorant': 'Georgia',

    // Monospace fonts
    'Fira Code': 'Courier New',
    'JetBrains Mono': 'Courier New',
    'Monaco': 'Courier New',
    'Consolas': 'Consolas',
    'Source Code Pro': 'Courier New',
    'IBM Plex Mono': 'Courier New',
    'Roboto Mono': 'Courier New',
    'Ubuntu Mono': 'Courier New',
    'Inconsolata': 'Courier New',
    'Hack': 'Courier New',
    'Menlo': 'Courier New',
    'monospace': 'Courier New',

    // Display/Decorative (fallback to sans-serif)
    'Bebas Neue': 'Arial',
    'Oswald': 'Arial',
    'Anton': 'Arial',
    'Abril Fatface': 'Georgia',
    'Lobster': 'Arial',
    'Pacifico': 'Arial',
    'Permanent Marker': 'Arial',
    'Satisfy': 'Arial',
    'Dancing Script': 'Arial',
    'Great Vibes': 'Arial',
};

// Standard fonts that should pass through unchanged
const STANDARD_FONTS = new Set([
    'Arial',
    'Helvetica',
    'Verdana',
    'Trebuchet MS',
    'Georgia',
    'Times New Roman',
    'Courier New',
    'Consolas',
    'serif',
    'sans-serif',
]);

// Font category detection for fallback
const detectFontCategory = (fontFamily: string): 'serif' | 'sans-serif' | 'monospace' => {
    const lower = fontFamily.toLowerCase();

    if (lower.includes('mono') || lower.includes('code') || lower.includes('consol')) {
        return 'monospace';
    }

    if (lower.includes('serif') && !lower.includes('sans')) {
        return 'serif';
    }

    // Check for known serif-style names
    const serifPatterns = ['georgia', 'times', 'garamond', 'baskerville', 'palatino', 'bodoni'];
    if (serifPatterns.some(pattern => lower.includes(pattern))) {
        return 'serif';
    }

    return 'sans-serif';
};

// Default fonts for each category
const CATEGORY_DEFAULTS: Record<'serif' | 'sans-serif' | 'monospace', string> = {
    'serif': 'Georgia',
    'sans-serif': 'Arial',
    'monospace': 'Courier New',
};

/**
 * Maps a font-family CSS value to a standard web-safe font
 */
export const mapToStandardFont = (fontFamily: string): string => {
    if (!fontFamily) return 'Arial';

    // Parse the font-family value (comma-separated list)
    const fonts = fontFamily
        .split(',')
        .map(f => f.trim().replace(/['"]/g, ''))
        .filter(f => f.length > 0);

    // Try each font in order
    for (const font of fonts) {
        // Check if it's already a standard font
        if (STANDARD_FONTS.has(font)) {
            return font;
        }

        // Check if we have a direct mapping
        if (FONT_MAP[font]) {
            return FONT_MAP[font];
        }
    }

    // No direct match found - detect category and use default
    const category = detectFontCategory(fonts[0] || 'sans-serif');
    return CATEGORY_DEFAULTS[category];
};

/**
 * Gets the jsPDF font name for a standard font
 */
export const getJsPDFFont = (fontFamily: string): string => {
    const standardFont = mapToStandardFont(fontFamily);

    switch (standardFont) {
        case 'Helvetica':
        case 'Arial':
        case 'Verdana':
        case 'Trebuchet MS':
            return 'helvetica';
        case 'Georgia':
        case 'Times New Roman':
            return 'times';
        case 'Courier New':
        case 'Consolas':
            return 'courier';
        default:
            return 'helvetica';
    }
};

/**
 * Gets the PowerPoint-compatible font name
 */
export const getPptxFont = (fontFamily: string): string => {
    const standardFont = mapToStandardFont(fontFamily);

    // PowerPoint supports these fonts natively
    switch (standardFont) {
        case 'Helvetica':
            return 'Arial';  // PowerPoint uses Arial instead of Helvetica
        case 'Times New Roman':
        case 'Georgia':
        case 'Verdana':
        case 'Trebuchet MS':
        case 'Courier New':
        case 'Consolas':
        case 'Arial':
            return standardFont;
        default:
            return 'Arial';
    }
};

/**
 * Sanitizes a font family string for safe use
 */
export const sanitizeFontFamily = (fontFamily: string | null | undefined): string => {
    if (!fontFamily) return 'Arial';

    // Remove problematic characters
    const cleaned = fontFamily
        .replace(/['"]/g, '')
        .split(',')[0]
        ?.trim();

    return cleaned || 'Arial';
};
