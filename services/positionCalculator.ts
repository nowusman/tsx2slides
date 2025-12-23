/**
 * Position Calculator Service
 * 
 * Precise position calculation with subpixel accuracy for layout extraction.
 * Handles transforms, scroll positions, and container offsets.
 */

export interface PreciseRect {
    // Absolute pixel values
    x: number;
    y: number;
    width: number;
    height: number;
    // Percentage values relative to container
    xPercent: number;
    yPercent: number;
    wPercent: number;
    hPercent: number;
}

export interface ContainerInfo {
    rect: DOMRect;
    width: number;
    height: number;
    scrollLeft: number;
    scrollTop: number;
}

/**
 * Gets container information for position calculations
 */
export const getContainerInfo = (container: HTMLElement): ContainerInfo => {
    const rect = container.getBoundingClientRect();
    return {
        rect,
        width: container.clientWidth || rect.width,
        height: container.clientHeight || rect.height,
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
    };
};

/**
 * Calculates precise position of an element relative to a container
 */
export const calculatePrecisePosition = (
    element: HTMLElement,
    containerInfo: ContainerInfo
): PreciseRect => {
    const elementRect = element.getBoundingClientRect();

    // Calculate absolute position relative to container
    const x = elementRect.left - containerInfo.rect.left + containerInfo.scrollLeft;
    const y = elementRect.top - containerInfo.rect.top + containerInfo.scrollTop;
    const width = elementRect.width;
    const height = elementRect.height;

    // Calculate percentages with precision
    const xPercent = (x / containerInfo.width) * 100;
    const yPercent = (y / containerInfo.height) * 100;
    const wPercent = (width / containerInfo.width) * 100;
    const hPercent = (height / containerInfo.height) * 100;

    return {
        x,
        y,
        width,
        height,
        xPercent: Math.round(xPercent * 1000) / 1000, // 3 decimal precision
        yPercent: Math.round(yPercent * 1000) / 1000,
        wPercent: Math.round(wPercent * 1000) / 1000,
        hPercent: Math.round(hPercent * 1000) / 1000,
    };
};

/**
 * Calculates position for a DOMRect (used for text nodes)
 */
export const calculateRectPosition = (
    rect: DOMRect,
    containerInfo: ContainerInfo
): PreciseRect => {
    const x = rect.left - containerInfo.rect.left + containerInfo.scrollLeft;
    const y = rect.top - containerInfo.rect.top + containerInfo.scrollTop;
    const width = rect.width;
    const height = rect.height;

    const xPercent = (x / containerInfo.width) * 100;
    const yPercent = (y / containerInfo.height) * 100;
    const wPercent = (width / containerInfo.width) * 100;
    const hPercent = (height / containerInfo.height) * 100;

    return {
        x,
        y,
        width,
        height,
        xPercent: Math.round(xPercent * 1000) / 1000,
        yPercent: Math.round(yPercent * 1000) / 1000,
        wPercent: Math.round(wPercent * 1000) / 1000,
        hPercent: Math.round(hPercent * 1000) / 1000,
    };
};

/**
 * Checks if an element is visible within the container bounds
 */
export const isVisibleInContainer = (
    position: PreciseRect,
    containerInfo: ContainerInfo
): boolean => {
    // Element is visible if at least partially within container
    return (
        position.x + position.width > 0 &&
        position.x < containerInfo.width &&
        position.y + position.height > 0 &&
        position.y < containerInfo.height
    );
};

/**
 * Checks if two rectangles overlap
 */
export const rectsOverlap = (a: PreciseRect, b: PreciseRect): boolean => {
    return !(
        a.x + a.width < b.x ||
        b.x + b.width < a.x ||
        a.y + a.height < b.y ||
        b.y + b.height < a.y
    );
};

/**
 * Checks if rectangle A fully contains rectangle B
 */
export const rectContains = (outer: PreciseRect, inner: PreciseRect): boolean => {
    return (
        inner.x >= outer.x &&
        inner.y >= outer.y &&
        inner.x + inner.width <= outer.x + outer.width &&
        inner.y + inner.height <= outer.y + outer.height
    );
};

/**
 * Creates a unique position key for deduplication
 */
export const getPositionKey = (rect: PreciseRect): string => {
    // Round to 1px precision for deduplication
    const x = Math.round(rect.x);
    const y = Math.round(rect.y);
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    return `${x},${y},${w},${h}`;
};

/**
 * Calculates the center point of a rectangle
 */
export const getRectCenter = (rect: PreciseRect): { x: number; y: number } => {
    return {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
    };
};
