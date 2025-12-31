/**
 * Image Extractor Service
 * 
 * Extracts images from DOM elements including <img> tags and background images.
 * Converts images to base64 for embedding in PDF/PPTX.
 */

import { calculatePrecisePosition, PreciseRect, ContainerInfo } from './positionCalculator';

export interface ExtractedImage {
    id: string;
    type: 'image';
    src: string;  // base64 data URL
    position: PreciseRect;
    format: 'png' | 'jpeg' | 'gif' | 'webp';
    zIndex: number;
    naturalWidth: number;
    naturalHeight: number;
}

interface ImageExtractionContext {
    containerInfo: ContainerInfo;
    idCounter: number;
    imageDataCache: Map<string, Promise<{ dataUrl: string; naturalWidth: number; naturalHeight: number }>>;
}

/**
 * Creates a new image extraction context
 */
export const createImageExtractionContext = (
    containerInfo: ContainerInfo
): ImageExtractionContext => ({
    containerInfo,
    idCounter: 0,
    imageDataCache: new Map(),
});

/**
 * Generates a unique ID for an image element
 */
const generateId = (context: ImageExtractionContext): string => {
    return `img-${++context.idCounter}`;
};

/**
 * Detects image format from data URL or file extension
 */
const detectImageFormat = (src: string): 'png' | 'jpeg' | 'gif' | 'webp' => {
    const lower = src.toLowerCase();

    if (lower.includes('data:image/jpeg') || lower.includes('.jpg') || lower.includes('.jpeg')) {
        return 'jpeg';
    }
    if (lower.includes('data:image/gif') || lower.includes('.gif')) {
        return 'gif';
    }
    if (lower.includes('data:image/webp') || lower.includes('.webp')) {
        return 'webp';
    }
    return 'png';  // Default to PNG
};

const getCachedImageData = (
    context: ImageExtractionContext,
    key: string,
    loader: () => Promise<{ dataUrl: string; naturalWidth: number; naturalHeight: number }>
) => {
    if (context.imageDataCache.size > 32) {
        context.imageDataCache.clear();
    }
    const existing = context.imageDataCache.get(key);
    if (existing) return existing;
    const created = loader();
    context.imageDataCache.set(key, created);
    return created;
};

/**
 * Converts an HTMLImageElement to a base64 data URL
 */
const imageToBase64 = (img: HTMLImageElement): Promise<string> => {
    return new Promise((resolve, reject) => {
        // If already a data URL, return it
        if (img.src.startsWith('data:')) {
            resolve(img.src);
            return;
        }

        // For external images, we need to draw to canvas
        try {
            const canvas = document.createElement('canvas');
            const width = img.naturalWidth || img.width || 100;
            const height = img.naturalHeight || img.height || 100;

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            // Draw the image
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to base64
            try {
                const dataUrl = canvas.toDataURL('image/png');
                resolve(dataUrl);
            } catch (err) {
                // CORS error - image from different origin
                console.warn('Could not convert image due to CORS:', img.src);
                reject(err);
            }
        } catch (err) {
            reject(err);
        }
    });
};

const loadUrlToBase64Png = (url: string): Promise<{ dataUrl: string; naturalWidth: number; naturalHeight: number }> => {
    return new Promise((resolve, reject) => {
        if (url.startsWith('data:')) {
            resolve({ dataUrl: url, naturalWidth: 0, naturalHeight: 0 });
            return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = async () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || 1;
                canvas.height = img.naturalHeight || 1;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }
                ctx.drawImage(img, 0, 0);
                resolve({
                    dataUrl: canvas.toDataURL('image/png'),
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight,
                });
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.src = url;
    });
};

/**
 * Extracts an <img> element as ExtractedImage
 */
export const extractImgElement = async (
    img: HTMLImageElement,
    context: ImageExtractionContext,
    zIndex: number
): Promise<ExtractedImage | null> => {
    // Skip if no source
    if (!img.src || img.src === 'about:blank') return null;

    // Skip if not visible
    const styles = window.getComputedStyle(img);
    if (styles.display === 'none' || styles.visibility === 'hidden') return null;

    const opacity = parseFloat(styles.opacity);
    if (opacity === 0) return null;

    // Calculate position
    const position = calculatePrecisePosition(img, context.containerInfo);

    // Skip if too small
    if (position.width < 1 || position.height < 1) return null;

    try {
        const srcKey = img.currentSrc || img.src;
        const cached = await getCachedImageData(context, `img:${srcKey}`, async () => {
            const dataUrl = await imageToBase64(img);
            return {
                dataUrl,
                naturalWidth: img.naturalWidth || img.width,
                naturalHeight: img.naturalHeight || img.height,
            };
        });

        return {
            id: generateId(context),
            type: 'image',
            src: cached.dataUrl,
            position,
            format: detectImageFormat(img.src),
            zIndex,
            naturalWidth: cached.naturalWidth || img.naturalWidth || img.width,
            naturalHeight: cached.naturalHeight || img.naturalHeight || img.height,
        };
    } catch (err) {
        console.warn('Failed to extract image:', err);
        return null;
    }
};

/**
 * Extracts a canvas element as an image
 */
export const extractCanvasElement = async (
    canvas: HTMLCanvasElement,
    context: ImageExtractionContext,
    zIndex: number
): Promise<ExtractedImage | null> => {
    const styles = window.getComputedStyle(canvas);
    if (styles.display === 'none' || styles.visibility === 'hidden') return null;

    const opacity = parseFloat(styles.opacity);
    if (opacity === 0) return null;

    const position = calculatePrecisePosition(canvas, context.containerInfo);
    if (position.width < 1 || position.height < 1) return null;

    try {
        const dataUrl = canvas.toDataURL('image/png');
        return {
            id: generateId(context),
            type: 'image',
            src: dataUrl,
            position,
            format: 'png',
            zIndex,
            naturalWidth: canvas.width || position.width,
            naturalHeight: canvas.height || position.height,
        };
    } catch (err) {
        console.warn('Failed to extract canvas:', err);
        return null;
    }
};

/**
 * Extracts background image from an element's CSS
 */
export const extractBackgroundImage = async (
    element: HTMLElement,
    styles: CSSStyleDeclaration,
    context: ImageExtractionContext,
    zIndex: number
): Promise<ExtractedImage | null> => {
    const bgImage = styles.backgroundImage;

    // Skip if no background image
    if (!bgImage || bgImage === 'none') return null;

    // Extract URL from url(...)
    const urlMatch = bgImage.match(/url\(['"]?([^'")\s]+)['"]?\)/);
    if (!urlMatch || !urlMatch[1]) return null;

    const url = urlMatch[1];

    try {
        const cached = await getCachedImageData(context, `bg:${url}`, () => loadUrlToBase64Png(url));
        const position = calculatePrecisePosition(element, context.containerInfo);

        if (position.width < 1 || position.height < 1) return null;

        return {
            id: generateId(context),
            type: 'image',
            src: cached.dataUrl,
            position,
            format: detectImageFormat(url),
            zIndex,
            naturalWidth: cached.naturalWidth || position.width,
            naturalHeight: cached.naturalHeight || position.height,
        };
    } catch (err) {
        console.warn('Failed to extract background image:', err);
        return null;
    }
};

/**
 * Extracts all images from a container element
 */
export const extractAllImages = async (
    container: HTMLElement,
    context: ImageExtractionContext,
    paintOrder: HTMLElement[],
    styleCache?: Map<HTMLElement, CSSStyleDeclaration>
): Promise<ExtractedImage[]> => {
    const images: ExtractedImage[] = [];
    const paintIndex = new Map<HTMLElement, number>();
    for (let i = 0; i < paintOrder.length; i++) {
        paintIndex.set(paintOrder[i], i);
    }

    // Find all <img> elements
    const imgElements = container.querySelectorAll('img');

    for (const img of imgElements) {
        const zIndex = paintIndex.get(img as any) ?? paintIndex.get(img.parentElement as any) ?? 0;
        const extracted = await extractImgElement(img, context, zIndex);
        if (extracted) {
            images.push(extracted);
        }
    }

    // Find elements with background images
    for (let i = 0; i < paintOrder.length; i++) {
        const element = paintOrder[i];
        const styles = styleCache?.get(element) ?? window.getComputedStyle(element);
        const extracted = await extractBackgroundImage(element, styles, context, i);
        if (extracted) {
            images.push(extracted);
        }
    }

    return images;
};

/**
 * Converts SVG element to base64 image
 */
export const svgToBase64 = async (svg: SVGElement): Promise<string | null> => {
    try {
        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        return new Promise((resolve) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Use 2x scale for better quality
                canvas.width = svg.clientWidth * 2 || 100;
                canvas.height = svg.clientHeight * 2 || 100;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    URL.revokeObjectURL(url);
                    resolve(null);
                    return;
                }

                ctx.scale(2, 2);
                ctx.drawImage(img, 0, 0);

                URL.revokeObjectURL(url);
                resolve(canvas.toDataURL('image/png'));
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(null);
            };

            img.src = url;
        });
    } catch (err) {
        console.warn('Failed to convert SVG to base64:', err);
        return null;
    }
};

/**
 * Extracts SVG element as image
 */
export const extractSvgElement = async (
    svg: SVGElement,
    context: ImageExtractionContext,
    zIndex: number
): Promise<ExtractedImage | null> => {
    const base64 = await svgToBase64(svg);
    if (!base64) return null;

    const rect = svg.getBoundingClientRect();
    const containerRect = context.containerInfo.rect;

    const position: PreciseRect = {
        x: rect.left - containerRect.left,
        y: rect.top - containerRect.top,
        width: rect.width,
        height: rect.height,
        xPercent: ((rect.left - containerRect.left) / context.containerInfo.width) * 100,
        yPercent: ((rect.top - containerRect.top) / context.containerInfo.height) * 100,
        wPercent: (rect.width / context.containerInfo.width) * 100,
        hPercent: (rect.height / context.containerInfo.height) * 100,
    };

    return {
        id: generateId(context),
        type: 'image',
        src: base64,
        position,
        format: 'png',
        zIndex,
        naturalWidth: rect.width * 2,  // We rendered at 2x
        naturalHeight: rect.height * 2,
    };
};
