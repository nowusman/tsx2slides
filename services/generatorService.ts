import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';
import { DocumentLayout, PageLayout, LayoutElement } from '../types';

// PDF Constants
const PDF_W = 297; // A4 Landscape width mm
const PDF_H = 210; // A4 Landscape height mm

export const generatePDF = (layout: DocumentLayout) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  layout.pages.forEach((page, index) => {
    if (index > 0) doc.addPage();

    // Background
    if (page.bgColor) {
      doc.setFillColor(page.bgColor);
      doc.rect(0, 0, PDF_W, PDF_H, 'F');
    }

    page.elements.forEach(el => {
      renderPdfElement(doc, el);
    });
  });

  doc.save(`${layout.title.replace(/\s+/g, '_')}.pdf`);
};

const renderPdfElement = (doc: jsPDF, el: LayoutElement) => {
  const x = (el.x / 100) * PDF_W;
  const y = (el.y / 100) * PDF_H;
  const w = (el.w / 100) * PDF_W;
  const h = (el.h / 100) * PDF_H;

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#000000');
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  if (el.type === 'rect' || el.type === 'circle') {
    if (el.bgColor) {
      const { r, g, b } = hexToRgb(el.bgColor);
      doc.setFillColor(r, g, b);
      doc.setDrawColor(r, g, b);
      
      if (el.type === 'rect') {
        const radius = el.radius ? el.radius * 0.264 : 2; // px -> mm approximation
        doc.roundedRect(x, y, w, h, radius, radius, 'F');
      } else {
        doc.ellipse(x + w/2, y + h/2, w/2, h/2, 'F');
      }
    }
    
    // Border/Stroke if color is provided but differs from bg or if no bg
    if (el.color && el.color !== el.bgColor) {
       const { r, g, b } = hexToRgb(el.color);
       doc.setDrawColor(r, g, b);
       doc.setLineWidth(0.5);
       if (el.type === 'rect') {
         const radius = el.radius ? el.radius * 0.264 : 2;
         doc.roundedRect(x, y, w, h, radius, radius, 'S');
       }
       else doc.ellipse(x + w/2, y + h/2, w/2, h/2, 'S');
    }
  }

  if (el.type === 'text' && el.text) {
    const { r, g, b } = hexToRgb(el.color || '#000000');
    doc.setTextColor(r, g, b);
    
    // Approximate font size scaling from px to pt
    const fontSizePx = el.fontSize || 16;
    const fontSize = fontSizePx * 0.75;
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", el.fontWeight === 'bold' ? 'bold' : 'normal');

    const lineHeightPx = el.lineHeight || fontSizePx * 1.2;
    const lineHeightFactor = lineHeightPx / fontSizePx;
    doc.setLineHeightFactor(lineHeightFactor);

    // Handle multiline text inside bounds
    // jsPDF splitTextToSize is useful here
    const textLines = doc.splitTextToSize(el.text, w);
    
    let textX = x;
    if (el.align === 'center') textX = x + w / 2;
    if (el.align === 'right') textX = x + w;

    doc.text(textLines, textX, y + (fontSize * 0.3527) , { align: el.align || 'left' }); 
    // y adjustment approximates baseline
  }

  if (el.type === 'line') {
     const { r, g, b } = hexToRgb(el.color || '#000000');
     doc.setDrawColor(r, g, b);
     doc.setLineWidth(1);
     doc.line(x, y, x + w, y + h); // Basic line from top-left to bottom-right of box
  }
};

export const generatePPTX = (layout: DocumentLayout) => {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9'; 
  // PPTXGenJS defaults: 10 inches x 5.625 inches

  layout.pages.forEach(page => {
    const slide = pptx.addSlide();
    
    if (page.bgColor) {
      slide.background = { color: page.bgColor.replace('#', '') };
    }
    
    if (page.notes) {
      slide.addNotes(page.notes);
    }

    page.elements.forEach(el => {
      const x = `${el.x}%`;
      const y = `${el.y}%`;
      const w = `${el.w}%`;
      const h = `${el.h}%`;

      const commonOptions: any = {
        x, y, w, h,
      };

      if (el.type === 'rect') {
        slide.addShape(pptx.ShapeType.rect, {
          ...commonOptions,
          fill: { color: el.bgColor?.replace('#', '') || 'FFFFFF', transparency: el.opacity ? (1 - el.opacity) * 100 : 0 },
          line: el.color ? { color: el.color.replace('#', ''), width: 1 } : undefined,
          rectRadius: el.radius ? Math.min(el.radius, 30) : undefined
        });
      }
      
      if (el.type === 'circle') {
         slide.addShape(pptx.ShapeType.ellipse, {
          ...commonOptions,
          fill: { color: el.bgColor?.replace('#', '') || 'FFFFFF' },
        });
      }

      if (el.type === 'text' && el.text) {
        slide.addText(el.text, {
          ...commonOptions,
          color: el.color ? el.color.replace('#', '') : '000000',
          fontSize: el.fontSize ? el.fontSize * 0.75 : 12,
          bold: el.fontWeight === 'bold',
          align: el.align || 'left',
          valign: 'top', // Default to top alignment for consistency with web
          fontFace: el.fontFamily || 'Arial',
          lineSpacing: el.lineHeight ? el.lineHeight * 0.75 : undefined,
          paraSpaceAfter: 6
        });
      }

      if (el.type === 'line') {
         slide.addShape(pptx.ShapeType.line, {
             x, y, w, h,
             line: { color: el.color?.replace('#', '') || '000000', width: 2 }
         });
      }
    });
  });

  pptx.writeFile({ fileName: `${layout.title.replace(/\s+/g, '_')}.pptx` });
};
