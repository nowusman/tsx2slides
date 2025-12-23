export interface LayoutElement {
  id: string;
  type: 'text' | 'rect' | 'circle' | 'line';
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
