/**
 * Generator Service
 * 
 * Generates PDF and PPTX files from layout data.
 * Supports text, shapes, and embedded images.
 * Uses enhanced text measurement and positioning for accurate output.
 */

import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';
import { DocumentLayout, PageLayout, LayoutElement, ExportOptions } from '../types';
import { getJsPDFFont, getPptxFont } from './fontMapper';
import {
  pxToPointsPDF,
  pxToPointsPPTX,
  pxToMM as pxToMm,
  calculateBaselineOffset,
  PDF_DIMENSIONS,
  PPTX_DIMENSIONS,
} from './fontSizeConverter';

// PDF Constants (A4 Landscape)
const PDF_W = PDF_DIMENSIONS.A4_LANDSCAPE.width; // 297 mm
const PDF_H = PDF_DIMENSIONS.A4_LANDSCAPE.height; // 210 mm

// PPTX Constants (16:9)
const PPTX_W = PPTX_DIMENSIONS.STANDARD_16_9.width; // 10 inches
const PPTX_H = PPTX_DIMENSIONS.STANDARD_16_9.height; // 5.625 inches

// Conversion helpers
const percentToMm = (percent: number, dimension: number): number => (percent / 100) * dimension;
const percentToInches = (percent: number, dimension: number): number => (percent / 100) * dimension;
const pxToPoints = (px: number): number => px * 0.75;

type ProgressCallback = (percent: number, message?: string) => void;

type QualityPreset = {
  imageScale: number;
  imageQuality: number;
  compression: 'FAST' | 'MEDIUM' | 'SLOW';
  precision: number;
  compressPdf: boolean;
};

const QUALITY_PRESETS: Record<'draft' | 'standard' | 'high', QualityPreset> = {
  draft: { imageScale: 0.65, imageQuality: 0.6, compression: 'FAST', precision: 2, compressPdf: true },
  standard: { imageScale: 0.85, imageQuality: 0.82, compression: 'MEDIUM', precision: 8, compressPdf: true },
  high: { imageScale: 1, imageQuality: 1, compression: 'SLOW', precision: 16, compressPdf: false },
};

const preparedImageCache = new Map<string, Promise<{ data: string; format: 'PNG' | 'JPEG' }>>();
const MAX_PREPARED_IMAGE_CACHE = 24;

/**
 * Converts hex color to RGB object
 */
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#000000');
  return result
    ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    }
    : { r: 0, g: 0, b: 0 };
};

/**
 * Determines the image format from a data URL
 */
const detectFormat = (dataUrl?: string): 'PNG' | 'JPEG' => {
  if (!dataUrl) return 'PNG';
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
  return 'PNG';
};

const getPresetKey = (preset: QualityPreset) =>
  `${preset.imageScale}|${preset.imageQuality}|${preset.compression}`;

/**
 * Downscales or recompresses an image data URL based on quality presets
 */
const prepareImageForQuality = async (
  dataUrl: string,
  preset: QualityPreset
): Promise<{ data: string; format: 'PNG' | 'JPEG' }> => {
  if (preparedImageCache.size > MAX_PREPARED_IMAGE_CACHE) {
    preparedImageCache.clear();
  }
  const cacheKey = `${getPresetKey(preset)}|${dataUrl}`;
  const existing = preparedImageCache.get(cacheKey);
  if (existing) return existing;

  const task: Promise<{ data: string; format: 'PNG' | 'JPEG' }> = (async (): Promise<{
    data: string;
    format: 'PNG' | 'JPEG';
  }> => {
    if (preset.imageScale === 1 && preset.imageQuality === 1) {
      return { data: dataUrl, format: detectFormat(dataUrl) };
    }

    return new Promise<{ data: string; format: 'PNG' | 'JPEG' }>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const width = Math.max(1, Math.round(img.naturalWidth * preset.imageScale));
        const height = Math.max(1, Math.round(img.naturalHeight * preset.imageScale));
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ data: dataUrl, format: detectFormat(dataUrl) });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const format: 'PNG' | 'JPEG' = preset.compression === 'SLOW' ? detectFormat(dataUrl) : 'JPEG';
        const encoded = canvas.toDataURL(
          format === 'JPEG' ? 'image/jpeg' : 'image/png',
          preset.imageQuality
        );
        resolve({ data: encoded, format });
      };
      img.onerror = () => resolve({ data: dataUrl, format: detectFormat(dataUrl) });
      img.src = dataUrl;
    });
  })();

  preparedImageCache.set(cacheKey, task);
  return task;
};

/**
 * Generates a PDF file from the document layout
 */
export const generatePDF = async (
  layout: DocumentLayout,
  options: ExportOptions = {},
  onProgress?: ProgressCallback
) => {
  const quality = options.quality || 'standard';
  const preset = QUALITY_PRESETS[quality];

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compressPdf: preset.compressPdf,
    precision: preset.precision,
  } as any);

  const totalElements = layout.pages.reduce((sum, page) => sum + page.elements.length, 0) || 1;
  let processed = 0;

  for (let index = 0; index < layout.pages.length; index++) {
    const page = layout.pages[index];
    if (index > 0) doc.addPage();

    // Draw page background
    if (page.bgColor && page.bgColor !== '#ffffff') {
      const { r, g, b } = hexToRgb(page.bgColor);
      doc.setFillColor(r, g, b);
      doc.rect(0, 0, PDF_W, PDF_H, 'F');
    }

    // Sort elements by their implicit z-order (shapes first, then text)
    const sortedElements = sortElementsForRendering(page.elements);

    // Render each element
    for (const el of sortedElements) {
      await renderPdfElement(doc, el, preset);
      processed += 1;
      const percent = Math.min(98, Math.round((processed / totalElements) * 90) + 8);
      onProgress?.(percent, 'Rendering PDF content');
    }
  }

  doc.save(`${sanitizeFilename(layout.title)}.pdf`);
  onProgress?.(100, 'PDF saved locally');
};

/**
 * Sorts elements for proper rendering order (shapes behind text)
 */
const sortElementsForRendering = (elements: LayoutElement[]): LayoutElement[] => {
  return [...elements].sort((a, b) => {
    // Images and shapes first, text last
    const order: Record<string, number> = {
      rect: 0,
      circle: 0,
      image: 1,
      line: 2,
      text: 3,
    };
    return (order[a.type] || 0) - (order[b.type] || 0);
  });
};

/**
 * Renders a single element to PDF
 */
const renderPdfElement = async (doc: jsPDF, el: LayoutElement, preset: QualityPreset) => {
  const x = percentToMm(el.x, PDF_W);
  const y = percentToMm(el.y, PDF_H);
  const w = percentToMm(el.w, PDF_W);
  const h = percentToMm(el.h, PDF_H);

  // Handle image elements
  if (el.imageData) {
    try {
      const prepared = await prepareImageForQuality(el.imageData, preset);
      const format = prepared.format;
      doc.addImage(prepared.data, format as any, x, y, w, h, undefined, preset.compression);
    } catch (err) {
      console.warn('Failed to add image to PDF:', err);
    }
    return;
  }

  // Handle shapes (rect/circle)
  if (el.type === 'rect' || el.type === 'circle') {
    renderPdfShape(doc, el, x, y, w, h);
    return;
  }

  // Handle text
  if (el.type === 'text' && el.text) {
    renderPdfText(doc, el, x, y, w, h);
    return;
  }

  // Handle lines
  if (el.type === 'line') {
    const { r, g, b } = hexToRgb(el.color || '#000000');
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.5);
    doc.line(x, y, x + w, y + h);
  }
};

/**
 * Renders a shape (rect/circle) to PDF
 */
const renderPdfShape = (
  doc: jsPDF,
  el: LayoutElement,
  x: number,
  y: number,
  w: number,
  h: number
) => {
  const opacity = el.opacity ?? 1;
  if (opacity === 0) return;

  // Set fill color if present
  if (el.bgColor) {
    const { r, g, b } = hexToRgb(el.bgColor);
    doc.setFillColor(r, g, b);
  }

  // Set stroke color if different from fill
  const hasStroke = el.color && el.color !== el.bgColor;
  if (hasStroke) {
    const { r, g, b } = hexToRgb(el.color);
    doc.setDrawColor(r, g, b);
    const strokeWidth = el.strokeWidthPx ? pxToMm(el.strokeWidthPx) : 0.3;
    doc.setLineWidth(strokeWidth);

    if (el.borderStyle === 'dashed') {
      (doc as any).setLineDash([2, 2]);
    } else if (el.borderStyle === 'dotted') {
      (doc as any).setLineDash([0.8, 1.6]);
    } else {
      (doc as any).setLineDash([]);
    }
  }

  // Determine draw mode
  const drawMode = el.bgColor && hasStroke ? 'FD' : el.bgColor ? 'F' : 'S';

  if (el.type === 'rect') {
    const radius = el.radius ? Math.min(pxToMm(el.radius), 10) : 0; // px to mm, max 10mm
    if (radius > 0) {
      doc.roundedRect(x, y, w, h, radius, radius, drawMode);
    } else {
      doc.rect(x, y, w, h, drawMode);
    }
  } else if (el.type === 'circle') {
    doc.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, drawMode);
  }

  // Reset dash pattern to avoid leaking into subsequent shapes
  if (hasStroke) {
    (doc as any).setLineDash([]);
  }
};

/**
 * Renders text to PDF with proper positioning and accurate baseline calculation
 */
const renderPdfText = (
  doc: jsPDF,
  el: LayoutElement,
  x: number,
  y: number,
  w: number,
  h: number
) => {
  const { r, g, b } = hexToRgb(el.color || '#000000');
  doc.setTextColor(r, g, b);

  // Font setup with accurate px to pt conversion
  const fontSizePx = el.fontSize || 16;
  const fontSizePt = pxToPointsPDF(fontSizePx);
  doc.setFontSize(fontSizePt);

  const fontName = getJsPDFFont(el.fontFamily || 'Arial');
  const fontWeight = el.fontWeight || 'normal';
  const fontStyle = fontWeight === 'bold' ? 'bold' : 'normal';

  try {
    doc.setFont(fontName, fontStyle);
  } catch {
    // Fallback to helvetica if font not available
    doc.setFont('helvetica', fontStyle);
  }

  // Line height calculation
  const lineHeightPx = el.lineHeight || fontSizePx * 1.2;
  const lineHeightFactor = Math.max(1, lineHeightPx / fontSizePx);
  doc.setLineHeightFactor(lineHeightFactor);

  // Calculate text position based on alignment
  let textX = x;
  const align = el.align || 'left';
  if (align === 'center') textX = x + w / 2;
  if (align === 'right') textX = x + w;

  // Split text to fit within width, accounting for padding
  const effectiveWidth = Math.max(w - 0.5, 1); // Small margin for safety
  const textLines = doc.splitTextToSize(el.text!, effectiveWidth);

  // Calculate baseline offset using precise conversion
  // Text is positioned at baseline in PDF, so we need to offset from top
  const baselineOffset = calculateBaselineOffset(fontSizePt);

  // Render text with proper options
  doc.text(textLines, textX, y + baselineOffset, {
    align: align,
    maxWidth: effectiveWidth,
    lineHeightFactor: lineHeightFactor,
  });
};

/**
 * Generates a PPTX file from the document layout
 */
export const generatePPTX = async (
  layout: DocumentLayout,
  options: ExportOptions = {},
  onProgress?: ProgressCallback
) => {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = layout.title;

  const quality = options.quality || 'standard';
  const preset = QUALITY_PRESETS[quality];
  const totalElements = layout.pages.reduce((sum, page) => sum + page.elements.length, 0) || 1;
  let processed = 0;

  for (const page of layout.pages) {
    const slide = pptx.addSlide();

    // Set background
    if (page.bgColor) {
      slide.background = { color: page.bgColor.replace('#', '') };
    }

    // Add notes if present
    if (page.notes) {
      slide.addNotes(page.notes);
    }

    // Sort elements for proper rendering order
    const sortedElements = sortElementsForRendering(page.elements);

    // Render each element
    for (const el of sortedElements) {
      await renderPptxElement(pptx, slide, el, preset);
      processed += 1;
      const percent = Math.min(98, Math.round((processed / totalElements) * 90) + 8);
      onProgress?.(percent, 'Placing shapes and text in PPTX');
    }
  }

  await pptx.writeFile({ fileName: `${sanitizeFilename(layout.title)}.pptx` });
  onProgress?.(100, 'PPTX ready to download');
};

/**
 * Renders a single element to PPTX
 */
const renderPptxElement = async (pptx: PptxGenJS, slide: any, el: LayoutElement, preset: QualityPreset) => {
  const x = `${el.x}%`;
  const y = `${el.y}%`;
  const w = `${el.w}%`;
  const h = `${el.h}%`;

  // Handle image elements
  if (el.imageData) {
    try {
      const prepared = await prepareImageForQuality(el.imageData, preset);
      slide.addImage({
        data: prepared.data,
        x,
        y,
        w,
        h,
      });
    } catch (err) {
      console.warn('Failed to add image to PPTX:', err);
    }
    return;
  }

  // Handle rectangles
  if (el.type === 'rect') {
    const options: any = {
      x,
      y,
      w,
      h,
      fill: el.bgColor
        ? {
          color: el.bgColor.replace('#', ''),
          transparency: el.opacity !== undefined ? (1 - el.opacity) * 100 : 0,
        }
        : undefined,
    };

    // Add border if present
    if (el.color || el.strokeWidthPx) {
      options.line = {
        color: (el.color || el.bgColor || '#000000').replace('#', ''),
        width: el.strokeWidthPx ? pxToPointsPPTX(el.strokeWidthPx) : 1,
      };

      if (el.borderStyle === 'dashed') {
        options.line.dashType = 'dash';
      } else if (el.borderStyle === 'dotted') {
        options.line.dashType = 'sysDot';
      }
    }

    // Add radius if present
    if (el.radius) {
      options.rectRadius = Math.min(el.radius / 10, 1); // Normalize to 0-1 range
    }

    slide.addShape(pptx.ShapeType.rect, options);
    return;
  }

  // Handle circles/ellipses
  if (el.type === 'circle') {
    slide.addShape(pptx.ShapeType.ellipse, {
      x,
      y,
      w,
      h,
      fill: el.bgColor ? { color: el.bgColor.replace('#', '') } : undefined,
      line: el.color || el.strokeWidthPx ? {
        color: (el.color || el.bgColor || '#000000').replace('#', ''),
        width: el.strokeWidthPx ? pxToPointsPPTX(el.strokeWidthPx) : 1,
        dashType: el.borderStyle === 'dashed' ? 'dash' : el.borderStyle === 'dotted' ? 'sysDot' : undefined,
      } : undefined,
    });
    return;
  }

  // Handle text with improved positioning
  if (el.type === 'text' && el.text) {
    // Use accurate px to points conversion for PPTX
    const fontSizePx = el.fontSize || 16;
    const fontSize = pxToPointsPPTX(fontSizePx);
    const fontFace = getPptxFont(el.fontFamily || 'Arial');

    // Calculate line spacing - PPTX uses points
    const lineHeightPx = el.lineHeight || fontSizePx * 1.2;
    const lineSpacingPt = pxToPointsPPTX(lineHeightPx);

    slide.addText(el.text, {
      x,
      y,
      w,
      h,
      color: el.color ? el.color.replace('#', '') : '000000',
      fontSize,
      bold: el.fontWeight === 'bold',
      fontFace,
      align: el.align || 'left',
      valign: 'top',
      wrap: true,
      shrinkText: false,
      lineSpacing: lineSpacingPt,
      paraSpaceBefore: 0,
      paraSpaceAfter: 0,
    });
    return;
  }

  // Handle lines
  if (el.type === 'line') {
    slide.addShape(pptx.ShapeType.line, {
      x,
      y,
      w,
      h,
      line: { color: el.color?.replace('#', '') || '000000', width: 2 },
    });
  }
};

/**
 * Sanitizes a filename for safe saving
 */
const sanitizeFilename = (name: string): string => {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 100);
};
