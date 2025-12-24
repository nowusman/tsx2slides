/**
 * Text Wrapper Service
 * 
 * Handles multi-line text extraction and wrapping.
 * Uses getClientRects() to accurately capture individual line positions.
 */

import { PreciseRect, ContainerInfo, calculateRectPosition } from './positionCalculator';
import { mapToStandardFont } from './fontMapper';
import { getTextMeasurer } from './textMeasurement';

export interface TextLine {
    id: string;
    text: string;
    position: PreciseRect;
    fontSize: number;
    fontFamily: string;
    fontWeight: 'normal' | 'bold';
    color: string;
    align: 'left' | 'center' | 'right';
    lineIndex: number;
}

export interface MultilineTextResult {
    lines: TextLine[];
    totalHeight: number;
    maxWidth: number;
}

export interface TextWrapperContext {
    containerInfo: ContainerInfo;
    idCounter: number;
    processedPositions: Set<string>;
    visitedNodes: WeakSet<Node>;
}

/**
 * Creates a new text wrapper context
 */
export const createTextWrapperContext = (containerInfo: ContainerInfo): TextWrapperContext => {
    return {
        containerInfo,
        idCounter: 0,
        processedPositions: new Set(),
        visitedNodes: new WeakSet(),
    };
};

/**
 * Generates a unique ID for a text line
 */
const generateLineId = (context: TextWrapperContext): string => {
    return `line_${++context.idCounter}`;
};

/**
 * Extracts RGB values from a color string
 */
const rgbToHex = (rgb: string | null): string => {
    if (!rgb) return '#000000';

    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return rgb.startsWith('#') ? rgb : '#000000';

    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');

    return `#${r}${g}${b}`;
};

/**
 * Gets text alignment from computed styles
 */
const getTextAlign = (styles: CSSStyleDeclaration): 'left' | 'center' | 'right' => {
    const align = styles.textAlign;
    if (align === 'center') return 'center';
    if (align === 'right' || align === 'end') return 'right';
    return 'left';
};

/**
 * Gets all text nodes within an element
 */
const getTextNodes = (element: HTMLElement, context: TextWrapperContext): Node[] => {
    const nodes: Node[] = [];
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: (node: Node): number => {
                const text = node.textContent?.trim();
                if (!text) return NodeFilter.FILTER_REJECT;

                if (context.visitedNodes.has(node)) {
                    return NodeFilter.FILTER_REJECT;
                }

                // Skip hidden text
                const parent = node.parentElement;
                if (parent) {
                    const style = window.getComputedStyle(parent);
                    if (style.display === 'none' || style.visibility === 'hidden') {
                        return NodeFilter.FILTER_REJECT;
                    }
                }

                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    let node: Node | null;
    while ((node = walker.nextNode())) {
        context.visitedNodes.add(node);
        nodes.push(node);
    }

    return nodes;
};

/**
 * Extracts text for a specific DOMRect from a text node
 */
const getTextForRect = (textNode: Node, rect: DOMRect, fullText: string): string => {
    const range = document.createRange();
    const text = textNode.textContent || '';

    // Try to find the specific text that corresponds to this rect
    for (let i = 0; i < text.length; i++) {
        range.setStart(textNode, i);

        for (let j = i + 1; j <= text.length; j++) {
            range.setEnd(textNode, j);
            const rangeRects = range.getClientRects();

            for (const rangeRect of rangeRects) {
                // Check if this range rect matches our target rect
                if (Math.abs(rangeRect.top - rect.top) < 2 &&
                    Math.abs(rangeRect.left - rect.left) < 2 &&
                    Math.abs(rangeRect.width - rect.width) < 2) {
                    return text.substring(i, j);
                }
            }
        }
    }

    // Fallback: return full text
    return fullText;
};

/**
 * Extracts individual text lines from a DOM element
 * Uses getClientRects() to accurately capture multi-line text
 */
export const extractTextLines = (
    element: HTMLElement,
    context: TextWrapperContext,
    zIndex: number = 0
): MultilineTextResult => {
    const lines: TextLine[] = [];
    const styles = window.getComputedStyle(element);
    const containerRect = context.containerInfo.rect;

    // Get font information
    const fontSize = parseFloat(styles.fontSize) || 16;
    const fontFamily = mapToStandardFont(styles.fontFamily);
    const fontWeight = (parseInt(styles.fontWeight) >= 600 || styles.fontWeight === 'bold') ? 'bold' : 'normal';
    const color = rgbToHex(styles.color);
    const align = getTextAlign(styles);

    // Get all text nodes within this element
    const textNodes = getTextNodes(element, context);

    let lineIndex = 0;
    let totalHeight = 0;
    let maxWidth = 0;

    for (const textNode of textNodes) {
        const range = document.createRange();
        range.selectNodeContents(textNode);

        const rects = Array.from(range.getClientRects());

        for (const rect of rects) {
            // Skip very small rects (likely whitespace)
            if (rect.width < 1 || rect.height < 1) continue;

            // Create position key to avoid duplicates
            const relX = rect.left - containerRect.left;
            const relY = rect.top - containerRect.top;
            const posKey = `${Math.round(relX)},${Math.round(relY)},${Math.round(rect.width)},${Math.round(rect.height)}`;
            if (context.processedPositions.has(posKey)) continue;
            context.processedPositions.add(posKey);

            // Get the text content for this specific line
            const lineText = getTextForRect(textNode, rect, textNode.textContent || '').trim();
            if (!lineText) continue;

            // Calculate position relative to container
            const position = calculateRectPosition(rect, context.containerInfo);

            lines.push({
                id: generateLineId(context),
                text: lineText,
                position,
                fontSize,
                fontFamily,
                fontWeight,
                color,
                align,
                lineIndex: lineIndex++,
            });

            totalHeight = Math.max(totalHeight, position.y + position.height);
            maxWidth = Math.max(maxWidth, position.x + position.width);
        }
    }

    return {
        lines,
        totalHeight,
        maxWidth,
    };
};

/**
 * Wraps text to fit within a specified width
 */
export const wrapTextToFit = (
    text: string,
    maxWidthPx: number,
    fontFamily: string,
    fontSize: number,
    fontWeight: 'normal' | 'bold' = 'normal'
): string[] => {
    const measurer = getTextMeasurer();
    return measurer.wrapText(text, maxWidthPx, fontFamily, fontSize, fontWeight);
};

/**
 * Calculates the Y position for each line of wrapped text
 */
export const calculateLinePositions = (
    lines: string[],
    startY: number,
    fontFamily: string,
    fontSize: number,
    lineHeightMultiplier: number = 1.2
): Array<{ text: string; y: number }> => {
    const lineHeight = fontSize * lineHeightMultiplier;

    return lines.map((text, index) => ({
        text,
        y: startY + (index * lineHeight),
    }));
};

/**
 * Merges adjacent text lines that are on the same visual line
 */
export const mergeAdjacentLines = (lines: TextLine[], threshold: number = 2): TextLine[] => {
    if (lines.length <= 1) return lines;

    const sorted = [...lines].sort((a, b) => {
        const yDiff = a.position.y - b.position.y;
        if (Math.abs(yDiff) > threshold) return yDiff;
        return a.position.x - b.position.x;
    });

    const merged: TextLine[] = [];
    let current = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];

        // Check if on the same line (similar Y position)
        const sameY = Math.abs(current.position.y - next.position.y) < threshold;

        // Check if horizontally adjacent (use current line's font size for spacing estimate)
        const adjacent = Math.abs(
            (current.position.x + current.position.width) - next.position.x
        ) < current.fontSize * 2;

        if (sameY && adjacent &&
            current.fontFamily === next.fontFamily &&
            current.fontSize === next.fontSize &&
            current.color === next.color) {
            // Merge the lines
            current = {
                ...current,
                text: current.text + ' ' + next.text,
                position: {
                    ...current.position,
                    width: (next.position.x + next.position.width) - current.position.x,
                    wPercent: ((next.position.x + next.position.width) - current.position.x) / current.position.width * current.position.wPercent,
                },
            };
        } else {
            merged.push(current);
            current = next;
        }
    }

    merged.push(current);
    return merged;
};
