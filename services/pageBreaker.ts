/**
 * Page Breaker Service
 *
 * Detects natural page breaks based on content height and element positions.
 * Prevents elements from being cut between pages and supports single-page mode.
 */

import { LayoutItem } from './domWalker';

export interface PageBreak {
    yPosition: number;
    elements: LayoutItem[];
}

export interface PaginationOptions {
    pageHeight: number;
    maxPages?: number;
    forceSinglePage?: boolean;
    contentHeight?: number;
    marginPx?: number;
}

/**
 * Gets the actual rendered content height, including overflow.
 */
export const getActualContentHeight = (container: HTMLElement): number => {
    const firstChild = container.firstElementChild as HTMLElement | null;
    const candidates = [
        container.scrollHeight,
        container.clientHeight,
        container.getBoundingClientRect().height,
        firstChild?.scrollHeight ?? 0,
        firstChild?.offsetHeight ?? 0,
        firstChild?.getBoundingClientRect().height ?? 0,
    ].filter((v) => v && !Number.isNaN(v));

    return candidates.length ? Math.max(...candidates) : container.clientHeight;
};

/**
 * Scales all elements to fit into a single page height.
 */
export const scaleLayoutToSinglePage = (
    elements: LayoutItem[],
    pageHeight: number,
    contentHeight: number
): LayoutItem[] => {
    if (contentHeight <= 0 || pageHeight <= 0) return elements;

    const scale = contentHeight > pageHeight ? pageHeight / contentHeight : 1;
    if (scale >= 0.999) return elements;

    return elements.map((el) => {
        const pos = el.position;
        const scaled = {
            ...pos,
            x: pos.x * scale,
            y: pos.y * scale,
            width: pos.width * scale,
            height: pos.height * scale,
            xPercent: pos.xPercent * scale,
            yPercent: pos.yPercent * scale,
            wPercent: pos.wPercent * scale,
            hPercent: pos.hPercent * scale,
        };

        return {
            ...el,
            position: scaled,
        };
    });
};

/**
 * Paginate layout items into pages without splitting elements between pages.
 */
export const paginateLayoutItems = (
    elements: LayoutItem[],
    options: PaginationOptions
): PageBreak[] => {
    const pageHeight = options.pageHeight;
    const marginPx = options.marginPx ?? 8;
    const maxPages = options.maxPages ?? Infinity;
    const contentHeight = options.contentHeight ?? pageHeight;

    if (options.forceSinglePage) {
        const scaled = scaleLayoutToSinglePage(elements, pageHeight, contentHeight);
        return [{
            yPosition: 0,
            elements: scaled.map((el) => ({
                ...el,
                position: {
                    ...el.position,
                    y: el.position.y,
                    yPercent: el.position.yPercent,
                },
            })),
        }];
    }

    const sorted = [...elements].sort((a, b) => a.position.y - b.position.y);
    const pages: PageBreak[] = [];
    let currentStart = 0;
    let currentElements: LayoutItem[] = [];

    const pushPage = () => {
        pages.push({
            yPosition: currentStart,
            elements: currentElements,
        });
        currentElements = [];
    };

    for (const el of sorted) {
        const elTop = el.position.y;
        const elBottom = el.position.y + el.position.height;
        const pageBottom = currentStart + pageHeight - marginPx;

        const crossesBoundary = elBottom > pageBottom && currentElements.length > 0;

        if (crossesBoundary && pages.length + 1 < maxPages) {
            pushPage();
            currentStart = pages.length * pageHeight;
        }

        const adjusted = {
            ...el,
            position: {
                ...el.position,
                y: el.position.y - currentStart,
                yPercent: ((el.position.y - currentStart) / pageHeight) * 100,
            },
        };

        currentElements.push(adjusted);
    }

    if (currentElements.length > 0 && pages.length < maxPages) {
        pushPage();
    }

    return pages;
};
