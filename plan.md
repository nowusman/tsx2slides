# TSX2Slides Improvement Plan

> **Goal**: Create a robust TSX/JSX to PDF/PPTX converter with text-based output, embedded images, excellent quality, and no overlapping elements.
>
> **Constraints**: Fully offline (no LLM/API calls), standard fonts only, text must be searchable/editable.
>
> **Last Updated**: 2025-12-24

---

## 📊 Status Overview

| Phase | Status | Progress |
|-------|--------|----------|
| Phase 1: Core Engine Overhaul | 🟢 Complete | 100% |
| Phase 2: Text Handling | 🟢 Complete | 100% |
| Phase 3: Element Support | 🟢 Complete | 100% |
| Phase 4: Multi-Page Handling | 🟢 Complete | 100% |
| Phase 5: UI/UX Improvements | 🟢 Complete | 100% |

**Legend**: 🔴 Not Started | 🟡 In Progress | 🟢 Complete | ⏸️ Blocked

---

## 🔍 Problem Analysis

### Current Issues

1. **Text Overlap**: DOM walker captures the same text multiple times when elements overlap
2. **Font Rendering**: Custom fonts cause missing glyphs; no font substitution
3. **Layout Drift**: Percentage-based positioning loses precision
4. **Z-Index Ignored**: Elements don't maintain proper stacking order
5. **Missing Features**: No images, SVG, gradients, shadows support
6. **Multi-page Bugs**: Pagination logic doesn't match actual overflow

### Root Causes

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CURRENT FLOW (Problematic)                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  TSX File → Transpile → Render → Walk DOM → Extract Geometry → Export  │
│                                       ↑                                 │
│                                       │                                 │
│                              Multiple passes capture                    │
│                              same text from different                   │
│                              parent elements                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Solution Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│ NEW FLOW (Text-Based with Images)                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  TSX File                                                               │
│      ↓                                                                  │
│  TypeScript Transpiler (existing)                                       │
│      ↓                                                                  │
│  React Renderer (existing)                                              │
│      ↓                                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ENHANCED DOM WALKER (new)                                        │   │
│  │                                                                  │   │
│  │  1. Build element tree with stacking contexts                    │   │
│  │  2. Track visited text nodes (deduplication map)                 │   │
│  │  3. Extract images/SVGs as base64                                │   │
│  │  4. Map fonts to standard alternatives                           │   │
│  │  5. Calculate precise positions (subpixel accurate)              │   │
│  │  6. Detect element overlaps and resolve layering                 │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│      ↓                                                                  │
│  LayoutDocument (enhanced type with z-order, images, etc.)              │
│      ↓                                                                  │
│  ┌────────────────────┐       ┌────────────────────┐                   │
│  │ PDF Generator      │       │ PPTX Generator     │                   │
│  │ - Text elements    │       │ - Text elements    │                   │
│  │ - Embedded images  │       │ - Embedded images  │                   │
│  │ - Shapes (vector)  │       │ - Shapes (vector)  │                   │
│  │ - Standard fonts   │       │ - Standard fonts   │                   │
│  └────────────────────┘       └────────────────────┘                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Phase 1: Core Engine Overhaul

**Priority**: 🔥 HIGH  
**Status**: 🟢 Complete  
**Estimated Effort**: 12 hours

### Objective
Completely rewrite the DOM walker to properly extract layout information without duplicates, with correct z-ordering, and proper font handling.

### Tasks

#### 1.1 Create Stacking Context Tracker
- **Status**: 🟢 Complete
- **File**: `services/stackingContext.ts` ✅ Created
- **Description**: Implement CSS stacking context rules to determine element render order
- **Approach**:
  ```typescript
  interface StackingContext {
    element: HTMLElement;
    zIndex: number;
    order: number;
    parent: StackingContext | null;
    children: StackingContext[];
  }
  
  // Build tree based on CSS stacking rules:
  // - position: relative/absolute/fixed with z-index
  // - opacity < 1
  // - transform, filter, etc.
  ```
- **Acceptance Criteria**:
  - [x] Correctly identifies stacking contexts
  - [x] Computes global render order for all elements
  - [x] Handles nested stacking contexts properly

#### 1.2 Implement Text Node Deduplication
- **Status**: 🟢 Complete
- **File**: `services/textExtractor.ts` ✅ Created
- **Description**: Track visited text nodes to prevent duplicate extraction
- **Approach**:
  ```typescript
  class TextNodeTracker {
    private visited = new WeakSet<Node>();
    private positionMap = new Map<string, LayoutElement>();
    
    extractTextOnce(node: Node): LayoutElement | null {
      if (this.visited.has(node)) return null;
      this.visited.add(node);
      
      // Check for position collision
      const key = `${rect.left},${rect.top},${rect.width}`;
      if (this.positionMap.has(key)) return null;
      
      // Extract and store
      const element = this.createTextElement(node);
      this.positionMap.set(key, element);
      return element;
    }
  }
  ```
- **Acceptance Criteria**:
  - [x] No duplicate text in output
  - [x] Text appears in correct positions
  - [x] Handles split text across lines

#### 1.3 Build Enhanced DOM Walker
- **Status**: 🟢 Complete
- **File**: `services/domWalker.ts` ✅ Created
- **Description**: New DOM traversal that uses stacking context and text deduplication
- **Approach**:
  ```typescript
  export class EnhancedDOMWalker {
    private stackingContext: StackingContextBuilder;
    private textTracker: TextNodeTracker;
    private elementCollector: ElementCollector;
    
    walk(container: HTMLElement): LayoutElement[] {
      // 1. Build stacking context tree
      const contexts = this.stackingContext.build(container);
      
      // 2. Walk in paint order (bottom to top)
      const paintOrder = this.getPaintOrder(contexts);
      
      // 3. Extract elements with deduplication
      for (const element of paintOrder) {
        this.processElement(element);
      }
      
      // 4. Return sorted by z-order
      return this.elementCollector.getSorted();
    }
  }
  ```
- **Acceptance Criteria**:
  - [x] Elements extracted in correct paint order
  - [x] No duplicate elements
  - [x] All visible elements captured

#### 1.4 Standard Font Mapper
- **Status**: 🟢 Complete
- **File**: `services/fontMapper.ts` ✅ Created
- **Description**: Map any font to standard web-safe fonts
- **Approach**:
  ```typescript
  const FONT_MAP: Record<string, string> = {
    // Sans-serif mappings
    'Inter': 'Arial',
    'Roboto': 'Arial',
    'Open Sans': 'Arial',
    'Helvetica Neue': 'Helvetica',
    'SF Pro': 'Arial',
    'system-ui': 'Arial',
    '-apple-system': 'Arial',
    
    // Serif mappings
    'Georgia': 'Georgia',
    'Times New Roman': 'Times New Roman',
    'Merriweather': 'Georgia',
    'Playfair Display': 'Georgia',
    
    // Monospace mappings
    'Fira Code': 'Courier New',
    'JetBrains Mono': 'Courier New',
    'Monaco': 'Courier New',
    'Consolas': 'Courier New',
  };
  
  export const mapToStandardFont = (fontFamily: string): string => {
    const fonts = fontFamily.split(',').map(f => f.trim().replace(/['"]/g, ''));
    for (const font of fonts) {
      if (FONT_MAP[font]) return FONT_MAP[font];
      if (['Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New'].includes(font)) {
        return font;
      }
    }
    return 'Arial'; // Safe default
  };
  ```
- **Acceptance Criteria**:
  - [x] All fonts map to standard fonts
  - [x] Preserves font weight and style
  - [x] No missing glyphs in output

#### 1.5 Precise Position Calculator
- **Status**: 🟢 Complete
- **File**: `services/positionCalculator.ts` ✅ Created
- **Description**: Calculate exact positions with subpixel accuracy
- **Approach**:
  ```typescript
  export interface PreciseRect {
    x: number;      // Absolute position in px
    y: number;
    width: number;
    height: number;
    // Converted values for output
    xPercent: number;
    yPercent: number;
    wPercent: number;
    hPercent: number;
  }
  
  export const calculatePrecisePosition = (
    element: HTMLElement,
    container: HTMLElement
  ): PreciseRect => {
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Use absolute values first, then convert
    const x = elementRect.left - containerRect.left;
    const y = elementRect.top - containerRect.top;
    
    return {
      x, y,
      width: elementRect.width,
      height: elementRect.height,
      xPercent: (x / containerRect.width) * 100,
      yPercent: (y / containerRect.height) * 100,
      wPercent: (elementRect.width / containerRect.width) * 100,
      hPercent: (elementRect.height / containerRect.height) * 100,
    };
  };
  ```
- **Acceptance Criteria**:
  - [x] Positions accurate to 0.1px
  - [x] Handles scrolled containers
  - [x] Works with transforms

#### 1.6 Refactor layoutEngine.ts
- **Status**: 🟢 Complete
- **File**: `services/layoutEngine.ts` ✅ Modified
- **Description**: Integrate new components into existing engine
- **Approach**:
  - Keep transpilation logic
  - Replace `extractLayoutFromDom` with `EnhancedDOMWalker`
  - Add error handling for edge cases
- **Acceptance Criteria**:
  - [x] All existing functionality preserved
  - [x] New walker properly integrated
  - [x] Better error messages

---

## 📋 Phase 2: Text Handling Improvements

**Priority**: 🔥 HIGH  
**Status**: 🟢 Complete  
**Estimated Effort**: 8 hours

### Objective
Ensure text is rendered correctly with proper sizing, spacing, and no overlap.

### Tasks

#### 2.1 Text Measurement Service
- **Status**: 🟢 Complete
- **File**: `services/textMeasurement.ts` ✅ Created
- **Description**: Use Canvas API for accurate text measurement
- **Approach**:
  ```typescript
  export class TextMeasurer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    
    constructor() {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d')!;
    }
    
    measure(text: string, font: string, size: number): TextMetrics {
      this.ctx.font = `${size}px ${font}`;
      return this.ctx.measureText(text);
    }
    
    getLineHeight(font: string, size: number): number {
      // Use font metrics for accurate line height
      const metrics = this.measure('Mg', font, size);
      return metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    }
  }
  ```
- **Acceptance Criteria**:
  - [x] Accurate text width measurement
  - [x] Correct line height calculation
  - [x] Works with all standard fonts

#### 2.2 Multi-line Text Handler
- **Status**: 🟢 Complete
- **File**: `services/textWrapper.ts` ✅ Created
- **Description**: Handle text wrapping and line breaks correctly
- **Approach**:
  ```typescript
  export interface TextLine {
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }
  
  export const extractTextLines = (
    node: HTMLElement,
    containerRect: DOMRect
  ): TextLine[] => {
    const range = document.createRange();
    const lines: TextLine[] = [];
    
    // Walk text nodes and use getClientRects for each
    const textNodes = getTextNodes(node);
    
    for (const textNode of textNodes) {
      range.selectNodeContents(textNode);
      const rects = Array.from(range.getClientRects());
      
      // Each rect is a line of text
      for (const rect of rects) {
        // Extract text for this specific rect
        const lineText = getTextForRect(textNode, rect);
        lines.push({
          text: lineText,
          x: rect.left - containerRect.left,
          y: rect.top - containerRect.top,
          width: rect.width,
          height: rect.height,
        });
      }
    }
    
    return deduplicateLines(lines);
  };
  ```
- **Acceptance Criteria**:
  - [x] Multi-line text extracted correctly
  - [x] Each line positioned independently
  - [x] No line duplicates

#### 2.3 Font Size Converter
- **Status**: 🟢 Complete
- **File**: `services/fontSizeConverter.ts` ✅ Created
- **Description**: Accurate px to pt conversion for PDF/PPTX
- **Approach**:
  ```typescript
  // PDF uses points (72 per inch)
  // Screen typically 96 DPI
  // 1pt = 1.333px approximately
  
  export const pxToPointsPDF = (px: number): number => {
    // jsPDF uses mm internally, needs different conversion
    return px * 0.75; // px to pt
  };
  
  export const pxToPointsPPTX = (px: number): number => {
    // PptxGenJS expects points
    return px * 0.75;
  };
  
  export const pxToMM = (px: number): number => {
    // 1 inch = 25.4mm = 96px
    return px * (25.4 / 96);
  };
  ```
- **Acceptance Criteria**:
  - [x] Text size matches visual size
  - [x] Consistent across PDF and PPTX
  - [x] Handles fractional sizes

#### 2.4 Improve PDF Text Rendering
- **Status**: 🟢 Complete
- **File**: `services/generatorService.ts` ✅ Modified
- **Description**: Fix PDF text positioning and sizing
- **Approach**:
  ```typescript
  const renderTextElement = (doc: jsPDF, el: TextLayoutElement) => {
    // Use precise positioning
    const x = pxToMM(el.xPx);
    const y = pxToMM(el.yPx);
    const w = pxToMM(el.widthPx);
    
    // Set font with mapped standard font
    const font = mapToStandardFont(el.fontFamily);
    doc.setFont(font === 'Arial' ? 'helvetica' : font.toLowerCase());
    
    // Convert size accurately
    const fontSize = pxToPointsPDF(el.fontSize);
    doc.setFontSize(fontSize);
    
    // Position at baseline, not top
    const baselineOffset = fontSize * 0.75; // Approximate ascent
    
    doc.text(el.text, x, y + baselineOffset, {
      align: el.align,
      maxWidth: w,
    });
  };
  ```
- **Acceptance Criteria**:
  - [x] Text positioned exactly as in browser
  - [x] No text overflow/clipping
  - [x] Correct alignment (left/center/right)

#### 2.5 Improve PPTX Text Rendering
- **Status**: 🟢 Complete
- **File**: `services/generatorService.ts` ✅ Modified
- **Description**: Fix PPTX text positioning and sizing
- **Approach**:
  ```typescript
  const addTextToPPTX = (slide: PptxGenJS.Slide, el: TextLayoutElement) => {
    slide.addText(el.text, {
      x: el.xPercent / 100 * 10,  // PPTX uses inches
      y: el.yPercent / 100 * 5.625,
      w: el.wPercent / 100 * 10,
      h: el.hPercent / 100 * 5.625,
      fontSize: pxToPointsPPTX(el.fontSize),
      fontFace: mapToStandardFont(el.fontFamily),
      color: el.color.replace('#', ''),
      bold: el.fontWeight === 'bold',
      align: el.align,
      valign: 'top',
      wrap: true,
      shrinkText: false,
    });
  };
  ```
- **Acceptance Criteria**:
  - [x] Text editable in PowerPoint
  - [x] Correct size and position
  - [x] No text overflow

---

## 📋 Phase 3: Element Support Enhancement

**Priority**: 🟠 MEDIUM  
**Status**: 🟢 Complete  
**Estimated Effort**: 10 hours

### Objective
Support images, SVGs, and other visual elements in the output.

### Tasks

#### 3.1 Image Extraction Service
- **Status**: 🟢 Complete
- **File**: `services/imageExtractor.ts` ✅ Created
- **Description**: Extract images as base64 for embedding
- **Approach**:
  ```typescript
  export interface ExtractedImage {
    src: string;        // base64 data URL
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'png' | 'jpeg' | 'gif' | 'webp';
  }
  
  export const extractImages = async (
    container: HTMLElement
  ): Promise<ExtractedImage[]> => {
    const images: ExtractedImage[] = [];
    
    // Find all <img> elements
    const imgElements = container.querySelectorAll('img');
    
    for (const img of imgElements) {
      const base64 = await imageToBase64(img);
      const rect = img.getBoundingClientRect();
      
      images.push({
        src: base64,
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        type: detectImageType(base64),
      });
    }
    
    // Also check for background images
    const bgImages = await extractBackgroundImages(container);
    images.push(...bgImages);
    
    return images;
  };
  
  const imageToBase64 = (img: HTMLImageElement): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    });
  };
  ```
- **Acceptance Criteria**:
  - [x] All `<img>` elements captured
  - [x] Background images captured
  - [x] Correct positioning in output

#### 3.2 SVG Extraction Service
- **Status**: 🟢 Complete
- **File**: `services/imageExtractor.ts` ✅ Included (svgToBase64, extractSvgElement functions)
- **Description**: Convert SVG elements to images for embedding
- **Approach**:
  ```typescript
  export const svgToImage = async (
    svg: SVGElement
  ): Promise<ExtractedImage> => {
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = svg.clientWidth * 2; // 2x for quality
        canvas.height = svg.clientHeight * 2;
        const ctx = canvas.getContext('2d')!;
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
        
        URL.revokeObjectURL(url);
        
        const rect = svg.getBoundingClientRect();
        resolve({
          src: canvas.toDataURL('image/png'),
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
          type: 'png',
        });
      };
      img.onerror = reject;
      img.src = url;
    });
  };
  ```
- **Acceptance Criteria**:
  - [x] Inline SVGs rendered correctly
  - [x] SVG preserves colors and shapes
  - [x] High resolution output

#### 3.3 Add Image Support to PDF Generator
- **Status**: 🟢 Complete
- **File**: `services/generatorService.ts` ✅ Already Implemented
- **Description**: Embed images in PDF output
- **Approach**:
  ```typescript
  const addImageToPDF = (doc: jsPDF, img: ExtractedImage, containerRect: DOMRect) => {
    const x = pxToMM(img.x - containerRect.left);
    const y = pxToMM(img.y - containerRect.top);
    const w = pxToMM(img.width);
    const h = pxToMM(img.height);
    
    doc.addImage(img.src, 'PNG', x, y, w, h);
  };
  ```
- **Acceptance Criteria**:
  - [x] Images appear in correct position
  - [x] Image quality acceptable
  - [x] No image distortion

#### 3.4 Add Image Support to PPTX Generator
- **Status**: 🟢 Complete
- **File**: `services/generatorService.ts` ✅ Already Implemented
- **Description**: Embed images in PPTX output
- **Approach**:
  ```typescript
  const addImageToPPTX = (slide: PptxGenJS.Slide, img: ExtractedImage) => {
    slide.addImage({
      data: img.src,
      x: `${img.xPercent}%`,
      y: `${img.yPercent}%`,
      w: `${img.wPercent}%`,
      h: `${img.hPercent}%`,
    });
  };
  ```
- **Acceptance Criteria**:
  - [x] Images appear in correct position
  - [x] Images can be moved/resized in PowerPoint
  - [x] No quality loss

#### 3.5 Gradient Fallback Handler
- **Status**: 🟢 Complete
- **File**: `services/gradientHandler.ts` ✅ Created
- **Description**: Convert CSS gradients to solid colors or images
- **Approach**:
  ```typescript
  export const handleGradient = (
    element: HTMLElement,
    styles: CSSStyleDeclaration
  ): { type: 'solid' | 'image'; value: string } => {
    const bg = styles.backgroundImage;
    
    if (!bg || bg === 'none') {
      return { type: 'solid', value: styles.backgroundColor };
    }
    
    if (bg.includes('gradient')) {
      // Option 1: Extract dominant color
      const dominantColor = extractDominantGradientColor(bg);
      
      // Option 2: Render to canvas and use as image
      // (for better fidelity)
      
      return { type: 'solid', value: dominantColor };
    }
    
    return { type: 'solid', value: styles.backgroundColor };
  };
  ```
- **Acceptance Criteria**:
  - [x] Gradients don't cause errors
  - [x] Reasonable fallback appearance
  - [x] No missing backgrounds

#### 3.6 Border and Shadow Handler
- **Status**: 🟢 Complete
- **File**: `services/visualEffects.ts` ✅ Created
- **Description**: Extract and render borders and shadows
- **Approach**:
  ```typescript
  export interface BorderInfo {
    width: number;
    style: string;
    color: string;
    radius: number;
  }
  
  export const extractBorder = (styles: CSSStyleDeclaration): BorderInfo | null => {
    const width = parseFloat(styles.borderWidth);
    if (!width || width < 0.5) return null;
    
    return {
      width,
      style: styles.borderStyle,
      color: rgbToHex(styles.borderColor),
      radius: parseFloat(styles.borderRadius) || 0,
    };
  };
  ```
- **Acceptance Criteria**:
  - [x] Borders rendered in PDF/PPTX
  - [x] Border radius respected
  - [x] Different border styles handled

---

## 📋 Phase 4: Multi-Page Handling

**Priority**: 🟠 MEDIUM  
**Status**: 🟢 Complete  
**Estimated Effort**: 5 hours

### Objective
Correctly handle content that spans multiple pages/slides.

### Tasks

#### 4.1 Page Break Detection
- **Status**: 🟢 Complete
- **File**: `services/pageBreaker.ts` ✅ Created, `services/layoutEngine.ts` ✅ Updated
- **Description**: Detect natural page breaks based on content height
- **Approach**:
  ```typescript
  export interface PageBreak {
    yPosition: number;
    elements: LayoutElement[];
  }
  
  export const detectPageBreaks = (
    elements: LayoutElement[],
    pageHeight: number
  ): PageBreak[] => {
    const pages: PageBreak[] = [];
    let currentPage: LayoutElement[] = [];
    let currentY = 0;
    
    // Sort by Y position
    const sorted = [...elements].sort((a, b) => a.y - b.y);
    
    for (const el of sorted) {
      const elBottom = el.y + el.h;
      
      if (elBottom > (pages.length + 1) * 100) {
        // Element crosses page boundary
        pages.push({
          yPosition: pages.length * pageHeight,
          elements: currentPage,
        });
        currentPage = [];
      }
      
      currentPage.push(el);
    }
    
    if (currentPage.length > 0) {
      pages.push({
        yPosition: pages.length * pageHeight,
        elements: currentPage,
      });
    }
    
    return pages;
  };
  ```
- **Acceptance Criteria**:
  - [x] Content correctly split across pages
  - [x] No elements cut in half
  - [x] Maintains element relationships

#### 4.2 Scroll Height Detection
- **Status**: 🟢 Complete
- **File**: `services/domWalker.ts`, `services/pageBreaker.ts`, `services/layoutEngine.ts` ✅ Updated
- **Description**: Use actual scroll height for pagination
- **Approach**:
  ```typescript
  const getActualContentHeight = (container: HTMLElement): number => {
    // Get the actual rendered height including overflow
    const firstChild = container.firstElementChild as HTMLElement;
    if (!firstChild) return container.clientHeight;
    
    return Math.max(
      container.scrollHeight,
      firstChild.scrollHeight,
      firstChild.offsetHeight
    );
  };
  ```
- **Acceptance Criteria**:
  - [x] All content captured, even if overflowing
  - [x] Correct page count calculated
  - [x] Works with CSS overflow

#### 4.3 Single Slide Mode
- **Status**: 🟢 Complete
- **File**: `services/layoutEngine.ts`, `services/pageBreaker.ts`, `App.tsx` ✅ Updated
- **Description**: Option to force single-page output
- **Approach**:
  ```typescript
  export interface ParseOptions {
    forceSinglePage?: boolean;
    maxPages?: number;
  }
  
  // If forceSinglePage, scale content to fit or clip
  ```
- **Acceptance Criteria**:
  - [x] Option available in UI
  - [x] Content scaled/clipped as appropriate
  - [x] Clear indication in preview

---

## 📋 Phase 5: UI/UX Improvements

**Priority**: 🟡 LOW  
**Status**: 🟢 Complete  
**Estimated Effort**: 8 hours

### Objective
Improve user experience with better feedback and controls.

### Tasks

#### 5.1 Export Progress Indicator
- **Status**: 🟢 Complete
- **File**: `components/ProgressIndicator.tsx` ✅ Created
- **Description**: Show detailed progress during export
- **Approach**:
  ```typescript
  interface ProgressState {
    stage: 'transpiling' | 'rendering' | 'extracting' | 'generating';
    percent: number;
    message: string;
  }
  ```
- **Acceptance Criteria**:
  - [x] Clear progress feedback
  - [x] Meaningful stage descriptions
  - [x] Smooth animations

#### 5.2 Preview Zoom Controls
- **Status**: 🟢 Complete
- **File**: `components/LayoutPreview.tsx` ✅ Updated
- **Description**: Add zoom in/out/fit controls
- **Acceptance Criteria**:
  - [x] Zoom buttons functional
  - [x] Fit to width option
  - [x] Zoom level indicator

#### 5.3 Error Recovery UI
- **Status**: 🟢 Complete
- **File**: `components/ErrorDisplay.tsx` ✅ Created
- **Description**: Better error messages with actionable suggestions
- **Approach**:
  ```typescript
  interface ErrorInfo {
    code: string;
    message: string;
    suggestion: string;
    canRetry: boolean;
  }
  ```
- **Acceptance Criteria**:
  - [x] Errors clearly explained
  - [x] Suggestions for fixes
  - [x] Retry button where applicable

#### 5.4 Drag and Drop Enhancement
- **Status**: 🟢 Complete
- **File**: `App.tsx` ✅ Updated
- **Description**: True drag and drop support with visual feedback
- **Acceptance Criteria**:
  - [x] Drop zone highlights on drag
  - [x] File type validation on drop
  - [x] Clear feedback for invalid files

#### 5.5 Export Quality Options
- **Status**: 🟢 Complete
- **File**: `App.tsx`, `services/generatorService.ts` ✅ Updated
- **Description**: Allow user to select output quality
- **Approach**:
  ```typescript
  type QualityLevel = 'draft' | 'standard' | 'high';
  
  // draft: faster, smaller files
  // standard: balanced (default)
  // high: maximum fidelity, larger files
  ```
- **Acceptance Criteria**:
  - [x] Quality selector in UI
  - [x] Visible file size difference
  - [x] Clear labels explaining trade-offs

---

## 📦 Dependencies

### Required Additions

| Package | Version | Purpose | Status |
|---------|---------|---------|--------|
| (none currently needed) | - | - | - |

### Existing Dependencies (Keep)

| Package | Version | Purpose |
|---------|---------|---------|
| jspdf | ^3.0.4 | PDF generation |
| pptxgenjs | ^4.0.1 | PPTX generation |
| typescript | ~5.8.2 | In-browser transpilation |
| react | ^19.2.3 | UI framework |
| react-dom | ^19.2.3 | React DOM rendering |
| lucide-react | ^0.562.0 | Icons |

---

## 🧪 Testing Strategy

### Unit Tests (Future)

| Area | Test Cases |
|------|------------|
| Font Mapper | Map custom fonts, handle unknowns |
| Text Deduplication | Overlapping elements, nested text |
| Position Calculator | Edge cases, transforms |
| Image Extractor | Various image types, CORS |


---

## 📝 Known Limitations

### Will Not Support (Out of Scope)

1. **Animations/Transitions**: Static capture only
2. **Interactive Elements**: Forms, buttons are visual only
3. **External Resources**: No network requests for images/fonts
4. **CSS :hover/:focus**: Only default state captured
5. **Canvas Elements**: Raw canvas content not captured
6. **WebGL/3D**: Not supported
7. **Video/Audio**: Not supported

### Partial Support

1. **Gradients**: Solid color fallback
2. **Shadows**: May not render in all cases
3. **Complex Borders**: Simplified representation
4. **Custom Fonts**: Mapped to standard alternatives



