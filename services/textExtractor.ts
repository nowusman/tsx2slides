/**
 * Text Extractor Service
 * 
 * Extracts text nodes from DOM with deduplication to prevent
 * the same text from being captured multiple times.
 */

import { calculateRectPosition, getPositionKey, PreciseRect, ContainerInfo } from './positionCalculator';
import { mapToStandardFont } from './fontMapper';

export interface TextElement {
    id: string;
    type: 'text';
    text: string;
    position: PreciseRect;
    color: string;
    fontSize: number;
    fontWeight: 'normal' | 'bold';
    fontFamily: string;
    align: 'left' | 'center' | 'right';
    lineHeight: number | undefined;
    zIndex: number;
}

interface TextExtractionContext {
    containerInfo: ContainerInfo;
    visitedNodes: WeakSet<Node>;
    positionMap: Map<string, TextElement>;
    idCounter: number;
}

/**
 * Creates a new text extraction context
 */
export const createTextExtractionContext = (
    containerInfo: ContainerInfo
): TextExtractionContext => ({
    containerInfo,
    visitedNodes: new WeakSet<Node>(),
    positionMap: new Map<string, TextElement>(),
    idCounter: 0,
});

/**
 * Converts RGB color to hex
 */
const rgbToHex = (rgb: string | null): string => {
    if (!rgb || rgb === 'rgba(0, 0, 0, 0)' || rgb === 'transparent') return '#000000';
    if (rgb.startsWith('#')) return rgb;

    const result = rgb.match(/\d+/g);
    if (!result || result.length < 3) return '#000000';

    const [r, g, b] = result.map((v) => parseInt(v, 10));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

/**
 * Extracts text alignment from CSS
 */
const getTextAlign = (styles: CSSStyleDeclaration): 'left' | 'center' | 'right' => {
    const align = styles.textAlign;
    if (align === 'center') return 'center';
    if (align === 'right' || align === 'end') return 'right';
    return 'left';
};

/**
 * Generates a unique ID for a text element
 */
const generateId = (context: TextExtractionContext): string => {
    return `text-${++context.idCounter}`;
};

/**
 * Extracts text from a single text node, avoiding duplicates
 */
const extractTextNode = (
    node: Node,
    parentElement: HTMLElement,
    styles: CSSStyleDeclaration,
    context: TextExtractionContext,
    zIndex: number
): TextElement | null => {
    // Skip if already visited
    if (context.visitedNodes.has(node)) return null;

    const text = node.textContent?.replace(/\s+/g, ' ').trim();
    if (!text) return null;

    // Mark as visited
    context.visitedNodes.add(node);

    // Create a range to get the bounding rect
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = Array.from(range.getClientRects());

    if (rects.length === 0) return null;

    // Use the first rect for single-line text, or combine for multi-line
    const combinedRect = rects.length === 1
        ? rects[0]
        : {
            left: Math.min(...rects.map(r => r.left)),
            top: Math.min(...rects.map(r => r.top)),
            right: Math.max(...rects.map(r => r.right)),
            bottom: Math.max(...rects.map(r => r.bottom)),
            width: 0,
            height: 0,
        };

    if (combinedRect.width === 0) {
        (combinedRect as any).width = combinedRect.right - combinedRect.left;
        (combinedRect as any).height = combinedRect.bottom - combinedRect.top;
    }

    const position = calculateRectPosition(combinedRect as DOMRect, context.containerInfo);

    // Skip if too small
    if (position.width < 0.5 || position.height < 0.5) return null;

    // Check for duplicate at same position
    const posKey = getPositionKey(position);
    if (context.positionMap.has(posKey)) {
        // Already have text at this position - could be same text from parent
        return null;
    }

    const fontSize = parseFloat(styles.fontSize) || 14;
    const lineHeightRaw = parseFloat(styles.lineHeight);

    const textElement: TextElement = {
        id: generateId(context),
        type: 'text',
        text,
        position,
        color: rgbToHex(styles.color),
        fontSize,
        fontWeight: parseInt(styles.fontWeight, 10) >= 600 || styles.fontWeight === 'bold' ? 'bold' : 'normal',
        fontFamily: mapToStandardFont(styles.fontFamily),
        align: getTextAlign(styles),
        lineHeight: isNaN(lineHeightRaw) ? undefined : lineHeightRaw,
        zIndex,
    };

    // Store in position map to prevent duplicates
    context.positionMap.set(posKey, textElement);

    return textElement;
};

/**
 * Finds all text nodes within an element
 */
const getTextNodes = (element: HTMLElement): Node[] => {
    const textNodes: Node[] = [];
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: (node) => {
                const text = node.textContent?.trim();
                return text ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        }
    );

    let node: Node | null;
    while ((node = walker.nextNode())) {
        textNodes.push(node);
    }

    return textNodes;
};

/**
 * Extracts all text elements from an HTML element and its children
 */
export const extractTextFromElement = (
    element: HTMLElement,
    context: TextExtractionContext,
    zIndex: number
): TextElement[] => {
    const results: TextElement[] = [];
    const styles = window.getComputedStyle(element);

    // Skip invisible elements
    if (styles.display === 'none' || styles.visibility === 'hidden') {
        return results;
    }

    // Skip if opacity is 0
    const opacity = parseFloat(styles.opacity);
    if (opacity === 0) return results;

    // Find all text nodes in this element (not in children)
    for (const child of Array.from(element.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
            const textElement = extractTextNode(child, element, styles, context, zIndex);
            if (textElement) {
                results.push(textElement);
            }
        }
    }

    return results;
};

/**
 * Extracts multi-line text with individual line positions
 */
export const extractTextLines = (
    element: HTMLElement,
    context: TextExtractionContext,
    zIndex: number
): TextElement[] => {
    const results: TextElement[] = [];
    const styles = window.getComputedStyle(element);

    // Skip invisible elements
    if (styles.display === 'none' || styles.visibility === 'hidden') {
        return results;
    }

    const textNodes = getTextNodes(element);

    for (const node of textNodes) {
        if (context.visitedNodes.has(node)) continue;
        context.visitedNodes.add(node);

        const range = document.createRange();
        range.selectNodeContents(node);
        const rects = Array.from(range.getClientRects());

        // Get the text content
        const fullText = node.textContent?.replace(/\s+/g, ' ').trim() || '';
        if (!fullText) continue;

        // For single rect, create one element
        if (rects.length === 1) {
            const rect = rects[0];
            if (rect.width < 0.5 || rect.height < 0.5) continue;

            const position = calculateRectPosition(rect, context.containerInfo);
            const posKey = getPositionKey(position);

            if (!context.positionMap.has(posKey)) {
                const textElement: TextElement = {
                    id: generateId(context),
                    type: 'text',
                    text: fullText,
                    position,
                    color: rgbToHex(styles.color),
                    fontSize: parseFloat(styles.fontSize) || 14,
                    fontWeight: parseInt(styles.fontWeight, 10) >= 600 || styles.fontWeight === 'bold' ? 'bold' : 'normal',
                    fontFamily: mapToStandardFont(styles.fontFamily),
                    align: getTextAlign(styles),
                    lineHeight: parseFloat(styles.lineHeight) || undefined,
                    zIndex,
                };

                context.positionMap.set(posKey, textElement);
                results.push(textElement);
            }
        } else {
            // Multiple rects means multiple lines - for now, combine them
            // This avoids text being split incorrectly
            const combined = {
                left: Math.min(...rects.map(r => r.left)),
                top: Math.min(...rects.map(r => r.top)),
                right: Math.max(...rects.map(r => r.right)),
                bottom: Math.max(...rects.map(r => r.bottom)),
                width: 0,
                height: 0,
                x: 0,
                y: 0,
                toJSON: () => ({}),
            };
            combined.width = combined.right - combined.left;
            combined.height = combined.bottom - combined.top;

            const position = calculateRectPosition(combined as DOMRect, context.containerInfo);
            const posKey = getPositionKey(position);

            if (!context.positionMap.has(posKey)) {
                const textElement: TextElement = {
                    id: generateId(context),
                    type: 'text',
                    text: fullText,
                    position,
                    color: rgbToHex(styles.color),
                    fontSize: parseFloat(styles.fontSize) || 14,
                    fontWeight: parseInt(styles.fontWeight, 10) >= 600 || styles.fontWeight === 'bold' ? 'bold' : 'normal',
                    fontFamily: mapToStandardFont(styles.fontFamily),
                    align: getTextAlign(styles),
                    lineHeight: parseFloat(styles.lineHeight) || undefined,
                    zIndex,
                };

                context.positionMap.set(posKey, textElement);
                results.push(textElement);
            }
        }
    }

    return results;
};

/**
 * Gets all extracted text elements from the context
 */
export const getAllExtractedText = (context: TextExtractionContext): TextElement[] => {
    return Array.from(context.positionMap.values());
};
