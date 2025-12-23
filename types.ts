/**
 * Type definitions for TSX2Slides
 */

export interface LayoutElement {
  id: string;
  type: 'text' | 'rect' | 'circle' | 'line' | 'image';
  text?: string;
  x: number; // percentage 0-100 relative to slide width
  y: number; // percentage 0-100 relative to slide height
  w: number; // percentage relative to slide width
  h: number; // percentage relative to slide height
  color: string; // hex text/stroke color
  bgColor?: string; // hex fill color
  fontSize?: number; // pixel size captured from computed styles
  fontWeight?: 'normal' | 'bold';
  align?: 'left' | 'center' | 'right';
  opacity?: number; // 0-1
  radius?: number; // px border radius when available
  fontFamily?: string;
  lineHeight?: number;
  // Image-specific fields
  imageData?: string; // base64 data URL for embedded images
  imageFormat?: 'png' | 'jpeg' | 'gif' | 'webp';
}

export interface PageLayout {
  pageNumber: number;
  bgColor: string;
  elements: LayoutElement[];
  notes?: string;
}

export interface DocumentLayout {
  title: string;
  pages: PageLayout[];
  summary: string;
}

export type ExportFormat = 'PDF' | 'PPTX';

/**
 * Extended types for enhanced layout extraction
 */

export interface PrecisePosition {
  x: number;      // Absolute position in px
  y: number;
  width: number;
  height: number;
  xPercent: number;
  yPercent: number;
  wPercent: number;
  hPercent: number;
}

export interface TextLayoutElement extends LayoutElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontFamily: string;
  align: 'left' | 'center' | 'right';
}

export interface ShapeLayoutElement extends LayoutElement {
  type: 'rect' | 'circle';
  bgColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface ImageLayoutElement extends LayoutElement {
  type: 'image';
  imageData: string;
  imageFormat: 'png' | 'jpeg' | 'gif' | 'webp';
  naturalWidth?: number;
  naturalHeight?: number;
}

export type EnhancedLayoutElement = TextLayoutElement | ShapeLayoutElement | ImageLayoutElement;

/**
 * Export options for PDF/PPTX generation
 */
export interface ExportOptions {
  quality?: 'draft' | 'standard' | 'high';
  includeImages?: boolean;
  embedFonts?: boolean;
  pageSize?: 'A4' | 'letter' | '16:9' | '4:3';
}
