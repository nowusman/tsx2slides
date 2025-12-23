/**
 * Enhanced DOM Walker
 * 
 * Walks the DOM tree in paint order, extracting layout elements
 * with proper z-ordering and deduplication.
 */

import { buildStackingContextTree, getPaintOrder } from './stackingContext';
import { getContainerInfo, calculatePrecisePosition, PreciseRect, ContainerInfo } from './positionCalculator';
import { createTextExtractionContext, extractTextLines, TextElement } from './textExtractor';
import { createImageExtractionContext, extractAllImages, extractSvgElement, ExtractedImage } from './imageExtractor';
import { mapToStandardFont } from './fontMapper';

export interface ShapeElement {
    id: string;
    type: 'rect' | 'circle';
    position: PreciseRect;
    bgColor: string | undefined;
    strokeColor: string | undefined;
    strokeWidth: number;
    opacity: number;
    radius: number | undefined;
    zIndex: number;
}

export type LayoutItem = TextElement | ShapeElement | ExtractedImage;

export interface EnhancedLayoutResult {
    elements: LayoutItem[];
    containerInfo: ContainerInfo;
    pageCount: number;
}

/**
 * Converts RGB color to hex format
 */
const rgbToHex = (rgb: string | null): string | undefined => {
    if (!rgb || rgb === 'rgba(0, 0, 0, 0)' || rgb === 'transparent') return undefined;
    if (rgb.startsWith('#')) return rgb;

    const result = rgb.match(/\d+/g);
    if (!result || result.length < 3) return undefined;

    const [r, g, b] = result.map((v) => parseInt(v, 10));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

/**
 * Checks if an element should be treated as a circle
 */
const isCircle = (styles: CSSStyleDeclaration): boolean => {
    const radius = styles.borderRadius;
    if (!radius) return false;

    // Check for 50% or very high percentage
    if (radius.includes('%')) {
        const value = parseFloat(radius);
        return value >= 45;
    }

    return false;
};

/**
 * Extracts shape information from an element
 */
const extractShape = (
    element: HTMLElement,
    styles: CSSStyleDeclaration,
    containerInfo: ContainerInfo,
    zIndex: number,
    idCounter: { value: number }
): ShapeElement | null => {
    const position = calculatePrecisePosition(element, containerInfo);

    // Skip if too small
    if (position.width < 1 || position.height < 1) return null;

    // Check visibility
    const opacity = parseFloat(styles.opacity);
    if (opacity === 0) return null;
    if (styles.display === 'none' || styles.visibility === 'hidden') return null;

    // Get colors
    const bgColor = rgbToHex(styles.backgroundColor);
    const borderWidth = parseFloat(styles.borderWidth) || 0;
    const strokeColor = borderWidth > 0 ? rgbToHex(styles.borderColor) : undefined;

    // Skip if no visible fill or stroke
    if (!bgColor && !strokeColor) return null;

    // Get border radius
    const radiusValue = parseFloat(styles.borderRadius);
    const radius = isNaN(radiusValue) ? undefined : radiusValue;

    return {
        id: `shape-${++idCounter.value}`,
        type: isCircle(styles) ? 'circle' : 'rect',
        position,
        bgColor,
        strokeColor,
        strokeWidth: borderWidth,
        opacity: isNaN(opacity) ? 1 : opacity,
        radius: isCircle(styles) ? undefined : radius,
        zIndex,
    };
};

/**
 * Enhanced DOM walker that extracts all layout elements
 */
export const walkDom = async (container: HTMLElement): Promise<EnhancedLayoutResult> => {
    const containerInfo = getContainerInfo(container);

    // Build stacking context and get paint order
    const stackingContext = buildStackingContextTree(container);
    const paintOrder = getPaintOrder(stackingContext);

    // Create extraction contexts
    const textContext = createTextExtractionContext(containerInfo);
    const imageContext = createImageExtractionContext(containerInfo);

    const elements: LayoutItem[] = [];
    const idCounter = { value: 0 };

    // Process elements in paint order (bottom to top)
    for (let i = 0; i < paintOrder.length; i++) {
        const element = paintOrder[i];

        // Skip the container itself
        if (element === container) continue;

        const styles = window.getComputedStyle(element);

        // Skip invisible elements
        if (styles.display === 'none' || styles.visibility === 'hidden') continue;

        // Extract shape (background, border)
        const shape = extractShape(element, styles, containerInfo, i, idCounter);
        if (shape) {
            elements.push(shape);
        }

        // Extract text
        const textElements = extractTextLines(element, textContext, i);
        elements.push(...textElements);

        // Extract SVG if this is an SVG element
        if (element.tagName.toLowerCase() === 'svg') {
            const svgImage = await extractSvgElement(element as unknown as SVGElement, imageContext, i);
            if (svgImage) {
                elements.push(svgImage);
            }
        }
    }

    // Extract images (including background images)
    const images = await extractAllImages(container, imageContext, paintOrder);
    elements.push(...images);

    // Sort by z-index to maintain proper layering
    elements.sort((a, b) => a.zIndex - b.zIndex);

    // Calculate page count based on content height
    const contentHeight = Math.max(container.scrollHeight, containerInfo.height);
    const pageCount = Math.max(1, Math.ceil(contentHeight / containerInfo.height));

    return {
        elements,
        containerInfo,
        pageCount,
    };
};

/**
 * Splits elements into pages based on their Y position
 */
export const splitIntoPages = (
    elements: LayoutItem[],
    containerHeight: number
): LayoutItem[][] => {
    const pages: LayoutItem[][] = [];

    // Group elements by page based on their center Y position
    for (const element of elements) {
        const centerY = element.position.y + element.position.height / 2;
        const pageIndex = Math.floor(centerY / containerHeight);

        // Ensure the page array exists
        while (pages.length <= pageIndex) {
            pages.push([]);
        }

        // Adjust Y position relative to page
        const adjustedElement = {
            ...element,
            position: {
                ...element.position,
                y: element.position.y - (pageIndex * containerHeight),
                yPercent: ((element.position.y - (pageIndex * containerHeight)) / containerHeight) * 100,
            },
        };

        pages[pageIndex].push(adjustedElement);
    }

    // Ensure at least one page
    if (pages.length === 0) {
        pages.push([]);
    }

    return pages;
};

/**
 * Validates and cleans up extracted elements
 */
export const validateElements = (elements: LayoutItem[]): LayoutItem[] => {
    return elements.filter(el => {
        // Remove elements with invalid positions
        if (el.position.width <= 0 || el.position.height <= 0) return false;

        // Remove elements outside container bounds
        if (el.position.xPercent > 100 || el.position.yPercent > 100) return false;
        if (el.position.xPercent + el.position.wPercent < 0) return false;
        if (el.position.yPercent + el.position.hPercent < 0) return false;

        // For text, ensure there's actual content
        if (el.type === 'text' && (!el.text || el.text.trim().length === 0)) return false;

        return true;
    });
};
