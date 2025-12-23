/**
 * Generator Service
 * 
 * Generates PDF and PPTX files from layout data.
 * Supports text, shapes, and embedded images.
 */

import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';
import { DocumentLayout, PageLayout, LayoutElement } from '../types';
import { getJsPDFFont, getPptxFont } from './fontMapper';

// PDF Constants (A4 Landscape)
const PDF_W = 297; // mm
const PDF_H = 210; // mm

// Conversion helpers
const pxToMm = (px: number): number => px * (25.4 / 96);
const percentToMm = (percent: number, dimension: number): number => (percent / 100) * dimension;
const pxToPoints = (px: number): number => px * 0.75;

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
 * Generates a PDF file from the document layout
 */
export const generatePDF = (layout: DocumentLayout) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  layout.pages.forEach((page, index) => {
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
    sortedElements.forEach((el) => {
      renderPdfElement(doc, el);
    });
  });

  doc.save(`${sanitizeFilename(layout.title)}.pdf`);
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
const renderPdfElement = (doc: jsPDF, el: LayoutElement) => {
  const x = percentToMm(el.x, PDF_W);
  const y = percentToMm(el.y, PDF_H);
  const w = percentToMm(el.w, PDF_W);
  const h = percentToMm(el.h, PDF_H);

  // Handle image elements
  if (el.imageData) {
    try {
      const format = el.imageFormat?.toUpperCase() || 'PNG';
      doc.addImage(el.imageData, format as any, x, y, w, h);
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
    doc.setLineWidth(0.3);
  }

  // Determine draw mode
  const drawMode = el.bgColor && hasStroke ? 'FD' : el.bgColor ? 'F' : 'S';

  if (el.type === 'rect') {
    const radius = el.radius ? Math.min(el.radius * 0.264, 10) : 0; // px to mm, max 10mm
    if (radius > 0) {
      doc.roundedRect(x, y, w, h, radius, radius, drawMode);
    } else {
      doc.rect(x, y, w, h, drawMode);
    }
  } else if (el.type === 'circle') {
    doc.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, drawMode);
  }
};

/**
 * Renders text to PDF with proper positioning
 */
const renderPdfText = (
  doc: jsPDF,
  el: LayoutElement,
  x: number,
  y: number,
  w: number,
  _h: number
) => {
  const { r, g, b } = hexToRgb(el.color || '#000000');
  doc.setTextColor(r, g, b);

  // Font setup
  const fontSizePx = el.fontSize || 16;
  const fontSizePt = pxToPoints(fontSizePx);
  doc.setFontSize(fontSizePt);

  const fontName = getJsPDFFont(el.fontFamily || 'Arial');
  const fontStyle = el.fontWeight === 'bold' ? 'bold' : 'normal';
  doc.setFont(fontName, fontStyle);

  // Line height
  const lineHeightPx = el.lineHeight || fontSizePx * 1.2;
  const lineHeightFactor = lineHeightPx / fontSizePx;
  doc.setLineHeightFactor(lineHeightFactor);

  // Calculate text position based on alignment
  let textX = x;
  if (el.align === 'center') textX = x + w / 2;
  if (el.align === 'right') textX = x + w;

  // Split text to fit width
  const textLines = doc.splitTextToSize(el.text!, w);

  // Baseline offset for proper vertical positioning
  const baselineOffset = fontSizePt * 0.3527; // pt to mm approximation

  doc.text(textLines, textX, y + baselineOffset, {
    align: el.align || 'left',
    maxWidth: w,
  });
};

/**
 * Generates a PPTX file from the document layout
 */
export const generatePPTX = (layout: DocumentLayout) => {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = layout.title;

  layout.pages.forEach((page) => {
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
    sortedElements.forEach((el) => {
      renderPptxElement(pptx, slide, el);
    });
  });

  pptx.writeFile({ fileName: `${sanitizeFilename(layout.title)}.pptx` });
};

/**
 * Renders a single element to PPTX
 */
const renderPptxElement = (pptx: PptxGenJS, slide: any, el: LayoutElement) => {
  const x = `${el.x}%`;
  const y = `${el.y}%`;
  const w = `${el.w}%`;
  const h = `${el.h}%`;

  // Handle image elements
  if (el.imageData) {
    try {
      slide.addImage({
        data: el.imageData,
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

    // Add border if color differs from fill
    if (el.color && el.color !== el.bgColor) {
      options.line = { color: el.color.replace('#', ''), width: 1 };
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
      line: el.color ? { color: el.color.replace('#', ''), width: 1 } : undefined,
    });
    return;
  }

  // Handle text
  if (el.type === 'text' && el.text) {
    const fontSize = el.fontSize ? pxToPoints(el.fontSize) : 12;
    const fontFace = getPptxFont(el.fontFamily || 'Arial');

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
      lineSpacing: el.lineHeight ? pxToPoints(el.lineHeight) : undefined,
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
