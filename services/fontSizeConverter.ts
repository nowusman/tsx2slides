/**
 * Font Size Converter Service
 * 
 * Provides accurate conversion between pixel (px), point (pt), and millimeter (mm) units.
 * Essential for consistent text sizing across PDF and PPTX outputs.
 */

/**
 * Standard DPI values for different contexts
 */
const DPI = {
    SCREEN: 96,      // Standard screen DPI
    PRINT: 72,       // Points per inch (used in PDF)
    HIGH_DPI: 144,   // Retina/High DPI screens
};

/**
 * Conversion constants
 */
const CONVERSIONS = {
    PX_PER_INCH: DPI.SCREEN,
    PT_PER_INCH: DPI.PRINT,
    MM_PER_INCH: 25.4,
    PX_TO_PT_RATIO: DPI.PRINT / DPI.SCREEN, // 0.75
    PT_TO_PX_RATIO: DPI.SCREEN / DPI.PRINT, // 1.333...
};

/**
 * Converts pixels to points for PDF output
 * jsPDF uses points internally
 */
export const pxToPointsPDF = (px: number): number => {
    return px * CONVERSIONS.PX_TO_PT_RATIO;
};

/**
 * Converts pixels to points for PPTX output
 * PptxGenJS expects points for font sizes
 */
export const pxToPointsPPTX = (px: number): number => {
    return px * CONVERSIONS.PX_TO_PT_RATIO;
};

/**
 * Converts pixels to millimeters
 * Used for positioning in jsPDF (which uses mm by default)
 */
export const pxToMM = (px: number): number => {
    return px * (CONVERSIONS.MM_PER_INCH / DPI.SCREEN);
};

/**
 * Converts millimeters to pixels
 */
export const mmToPx = (mm: number): number => {
    return mm * (DPI.SCREEN / CONVERSIONS.MM_PER_INCH);
};

/**
 * Converts points to pixels
 */
export const ptToPx = (pt: number): number => {
    return pt * CONVERSIONS.PT_TO_PX_RATIO;
};

/**
 * Converts points to millimeters
 */
export const ptToMM = (pt: number): number => {
    return pt * (CONVERSIONS.MM_PER_INCH / DPI.PRINT);
};

/**
 * Converts millimeters to points
 */
export const mmToPt = (mm: number): number => {
    return mm * (DPI.PRINT / CONVERSIONS.MM_PER_INCH);
};

/**
 * Converts percentage to millimeters given a reference dimension
 */
export const percentToMM = (percent: number, referenceMM: number): number => {
    return (percent / 100) * referenceMM;
};

/**
 * Converts percentage to pixels given a reference dimension
 */
export const percentToPx = (percent: number, referencePx: number): number => {
    return (percent / 100) * referencePx;
};

/**
 * Converts pixels to percentage given a reference dimension
 */
export const pxToPercent = (px: number, referencePx: number): number => {
    if (referencePx === 0) return 0;
    return (px / referencePx) * 100;
};

/**
 * PDF page dimensions in mm (A4 Landscape)
 */
export const PDF_DIMENSIONS = {
    A4_LANDSCAPE: { width: 297, height: 210 },
    A4_PORTRAIT: { width: 210, height: 297 },
    LETTER_LANDSCAPE: { width: 279.4, height: 215.9 },
    LETTER_PORTRAIT: { width: 215.9, height: 279.4 },
};

/**
 * PPTX slide dimensions in inches (16:9 standard)
 */
export const PPTX_DIMENSIONS = {
    STANDARD_16_9: { width: 10, height: 5.625 },
    STANDARD_4_3: { width: 10, height: 7.5 },
};

/**
 * Converts pixel position to PDF coordinates (mm)
 */
export const pxToPDFPosition = (
    pxX: number,
    pxY: number,
    containerWidth: number,
    containerHeight: number,
    pdfDimensions = PDF_DIMENSIONS.A4_LANDSCAPE
): { x: number; y: number } => {
    const xPercent = (pxX / containerWidth) * 100;
    const yPercent = (pxY / containerHeight) * 100;

    return {
        x: percentToMM(xPercent, pdfDimensions.width),
        y: percentToMM(yPercent, pdfDimensions.height),
    };
};

/**
 * Converts pixel dimensions to PDF coordinates (mm)
 */
export const pxToPDFDimensions = (
    pxWidth: number,
    pxHeight: number,
    containerWidth: number,
    containerHeight: number,
    pdfDimensions = PDF_DIMENSIONS.A4_LANDSCAPE
): { width: number; height: number } => {
    const wPercent = (pxWidth / containerWidth) * 100;
    const hPercent = (pxHeight / containerHeight) * 100;

    return {
        width: percentToMM(wPercent, pdfDimensions.width),
        height: percentToMM(hPercent, pdfDimensions.height),
    };
};

/**
 * Converts percentage position to PPTX coordinates (inches)
 */
export const percentToPPTXPosition = (
    xPercent: number,
    yPercent: number,
    slideDimensions = PPTX_DIMENSIONS.STANDARD_16_9
): { x: number; y: number } => {
    return {
        x: (xPercent / 100) * slideDimensions.width,
        y: (yPercent / 100) * slideDimensions.height,
    };
};

/**
 * Converts percentage dimensions to PPTX dimensions (inches)
 */
export const percentToPPTXDimensions = (
    wPercent: number,
    hPercent: number,
    slideDimensions = PPTX_DIMENSIONS.STANDARD_16_9
): { width: number; height: number } => {
    return {
        width: (wPercent / 100) * slideDimensions.width,
        height: (hPercent / 100) * slideDimensions.height,
    };
};

/**
 * Calculates the baseline offset for text positioning
 * Text in PDFs is positioned by baseline, not top
 */
export const calculateBaselineOffset = (fontSizePt: number): number => {
    // Approximate ascent ratio for common fonts
    const ascentRatio = 0.75;
    return fontSizePt * ascentRatio * (CONVERSIONS.MM_PER_INCH / DPI.PRINT);
};

/**
 * Scales a font size based on device pixel ratio for high-DPI displays
 */
export const scaleForDPI = (px: number, dpr: number = window.devicePixelRatio || 1): number => {
    return px * dpr;
};

/**
 * Normalizes font size from various units to pixels
 */
export const normalizeFontSizeToPx = (value: string | number): number => {
    if (typeof value === 'number') return value;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 16; // Default

    if (value.endsWith('pt')) {
        return ptToPx(numValue);
    } else if (value.endsWith('em') || value.endsWith('rem')) {
        return numValue * 16; // Assuming base 16px
    } else if (value.endsWith('mm')) {
        return mmToPx(numValue);
    }

    return numValue; // Assume px
};
