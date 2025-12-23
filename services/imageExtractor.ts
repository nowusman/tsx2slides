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
    extractedUrls: Set<string>;  // Track processed image URLs
}

/**
 * Creates a new image extraction context
 */
export const createImageExtractionContext = (
    containerInfo: ContainerInfo
): ImageExtractionContext => ({
    containerInfo,
    idCounter: 0,
    extractedUrls: new Set<string>(),
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
        const base64 = await imageToBase64(img);

        return {
            id: generateId(context),
            type: 'image',
            src: base64,
            position,
            format: detectImageFormat(img.src),
            zIndex,
            naturalWidth: img.naturalWidth || img.width,
            naturalHeight: img.naturalHeight || img.height,
        };
    } catch (err) {
        console.warn('Failed to extract image:', err);
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

    // Skip if already extracted
    if (context.extractedUrls.has(url)) return null;
    context.extractedUrls.add(url);

    // Create an image to load the background
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = async () => {
            const position = calculatePrecisePosition(element, context.containerInfo);

            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(null);
                    return;
                }

                ctx.drawImage(img, 0, 0);
                const base64 = canvas.toDataURL('image/png');

                resolve({
                    id: generateId(context),
                    type: 'image',
                    src: base64,
                    position,
                    format: detectImageFormat(url),
                    zIndex,
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight,
                });
            } catch (err) {
                console.warn('Failed to extract background image:', err);
                resolve(null);
            }
        };

        img.onerror = () => {
            console.warn('Failed to load background image:', url);
            resolve(null);
        };

        img.src = url;
    });
};

/**
 * Extracts all images from a container element
 */
export const extractAllImages = async (
    container: HTMLElement,
    context: ImageExtractionContext,
    paintOrder: HTMLElement[]
): Promise<ExtractedImage[]> => {
    const images: ExtractedImage[] = [];

    // Find all <img> elements
    const imgElements = container.querySelectorAll('img');

    for (const img of imgElements) {
        const zIndex = paintOrder.indexOf(img.parentElement || img as any);
        const extracted = await extractImgElement(img, context, zIndex);
        if (extracted) {
            images.push(extracted);
        }
    }

    // Find elements with background images
    for (let i = 0; i < paintOrder.length; i++) {
        const element = paintOrder[i];
        const styles = window.getComputedStyle(element);
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
