/**
 * Layout Engine
 * 
 * Transpiles TSX content and extracts layout information for PDF/PPTX generation.
 * Uses the enhanced DOM walker for accurate element extraction.
 */

import React from 'react';
import * as ReactDOM from 'react-dom/client';
import * as ts from 'typescript';
import { DocumentLayout, ExportFormat, LayoutElement, PageLayout } from '../types';
import { walkDom, validateElements, LayoutItem, ShapeElement } from './domWalker';
import { TextElement } from './textExtractor';
import { ExtractedImage } from './imageExtractor';
import { paginateLayoutItems } from './pageBreaker';

const CONTAINER_WIDTH = 1280;
const CONTAINER_HEIGHT = 720;

export interface ParseRequest {
  content: string;
  format: ExportFormat;
  sourceName?: string | null;
  forceSinglePage?: boolean;
  maxPages?: number;
}

/**
 * Main entry point: parses TSX content and returns a document layout
 */
export const parseTsxToLayout = async ({ content, format, sourceName, forceSinglePage, maxPages }: ParseRequest): Promise<DocumentLayout> => {
  const container = document.getElementById('analysis-container');
  if (!container) {
    throw new Error('Hidden analysis container missing from DOM.');
  }

  // Normalize the hidden stage so measurements are consistent even if external CSS fails to load
  Object.assign(container.style, {
    position: 'absolute',
    left: '-9999px',
    top: '-9999px',
    width: `${CONTAINER_WIDTH}px`,
    height: `${CONTAINER_HEIGHT}px`,
    overflow: 'auto',
    visibility: 'visible',
    pointerEvents: 'none',
    background: '#ffffff',
  });

  // Transpile TSX to JavaScript
  const transpiled = transpileTsx(content, sourceName);

  // Create module scope for execution
  const module: { exports: Record<string, any> } = { exports: {} };
  const require = createRequire();
  const runner = new Function('require', 'module', 'exports', 'React', 'ReactDOM', transpiled);

  try {
    runner(require, module, module.exports, React, ReactDOM);
  } catch (err: any) {
    throw new Error(`Compile or execution error: ${err?.message || err}`);
  }

  // Find the React component
  const Component = resolveComponent(module.exports);
  if (!Component) {
    throw new Error('No React component export detected. Export a component as default or named export.');
  }

  // Prepare container
  container.innerHTML = '';
  const root = ReactDOM.createRoot(container);

  try {
    root.render(React.createElement(Component));
  } catch (err: any) {
    root.unmount();
    throw new Error(`Render failed: ${err?.message || err}`);
  }

  // Wait for layout to settle
  return new Promise((resolve, reject) => {
    window.requestAnimationFrame(() => {
      // Give layout time to settle for fonts/images
      setTimeout(async () => {
        try {
          const layout = await extractLayoutEnhanced(
            container,
            format,
            sourceName || 'TSX Capture',
            { forceSinglePage, maxPages }
          );
          root.unmount();
          resolve(layout);
        } catch (err) {
          root.unmount();
          reject(err);
        }
      }, 150);  // Slightly longer timeout for image loading
    });
  });
};

/**
 * Enhanced layout extraction using the new DOM walker
 */
const extractLayoutEnhanced = async (
  container: HTMLElement,
  _format: ExportFormat,
  title: string,
  options: { forceSinglePage?: boolean; maxPages?: number }
): Promise<DocumentLayout> => {
  // Use enhanced DOM walker
  const result = await walkDom(container);

  // Validate and clean elements
  const validElements = validateElements(result.elements);

  // Split into pages with smarter page breaking
  const pageBreaks = paginateLayoutItems(validElements, {
    pageHeight: result.containerInfo.height,
    maxPages: options.maxPages,
    forceSinglePage: options.forceSinglePage,
    contentHeight: result.contentHeight,
    marginPx: 12,
  });

  // Convert to legacy format for compatibility
  const pages: PageLayout[] = pageBreaks.map((breakInfo, index) => ({
    pageNumber: index + 1,
    bgColor: '#ffffff',
    elements: breakInfo.elements.map(el => convertToLegacyFormat(el)),
  }));

  // Ensure at least one page
  if (pages.length === 0) {
    pages.push({
      pageNumber: 1,
      bgColor: '#ffffff',
      elements: [],
    });
  }

  // Detect background color from first child
  const firstChild = container.firstElementChild as HTMLElement;
  if (firstChild) {
    const styles = window.getComputedStyle(firstChild);
    const bgColor = styles.backgroundColor;
    if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
      pages[0].bgColor = rgbToHex(bgColor) || '#ffffff';
    }
  }

  return {
    title,
    summary: `${pages.length} page${pages.length > 1 ? 's' : ''} captured offline`,
    pages,
  };
};

/**
 * Converts new LayoutItem to legacy LayoutElement format
 */
const convertToLegacyFormat = (item: LayoutItem): LayoutElement => {
  if (item.type === 'text') {
    const textItem = item as TextElement;
    return {
      id: textItem.id,
      type: 'text',
      text: textItem.text,
      x: textItem.position.xPercent,
      y: textItem.position.yPercent,
      w: textItem.position.wPercent,
      h: textItem.position.hPercent,
      color: textItem.color,
      fontSize: textItem.fontSize,
      fontWeight: textItem.fontWeight,
      fontFamily: textItem.fontFamily,
      align: textItem.align,
      lineHeight: textItem.lineHeight,
    };
  }

  if (item.type === 'image') {
    const imgItem = item as ExtractedImage;
    return {
      id: imgItem.id,
      type: 'image',
      x: imgItem.position.xPercent,
      y: imgItem.position.yPercent,
      w: imgItem.position.wPercent,
      h: imgItem.position.hPercent,
      imageData: imgItem.src,
      imageFormat: imgItem.format,
      color: '#000000',
      bgColor: '#ffffff',
      strokeWidthPx: 0,
    } as LayoutElement & { imageData?: string; imageFormat?: string };
  }

  // Shape (rect or circle)
  const shapeItem = item as ShapeElement;
  return {
    id: shapeItem.id,
    type: shapeItem.type,
    x: shapeItem.position.xPercent,
    y: shapeItem.position.yPercent,
    w: shapeItem.position.wPercent,
    h: shapeItem.position.hPercent,
    color: shapeItem.strokeColor || shapeItem.bgColor || '#000000',
    bgColor: shapeItem.bgColor,
    opacity: shapeItem.opacity,
    radius: shapeItem.radius,
    strokeWidthPx: shapeItem.strokeWidth,
    borderStyle: shapeItem.borderStyle,
    shadow: shapeItem.shadow ? {
      offsetXPx: shapeItem.shadow.offsetX,
      offsetYPx: shapeItem.shadow.offsetY,
      blurPx: shapeItem.shadow.blur,
      spreadPx: shapeItem.shadow.spread,
      color: shapeItem.shadow.color,
      inset: shapeItem.shadow.inset,
    } : undefined,
  };
};

/**
 * Converts RGB color string to hex
 */
const rgbToHex = (rgb: string | null): string | undefined => {
  if (!rgb || rgb === 'rgba(0, 0, 0, 0)' || rgb === 'transparent') return undefined;
  if (rgb.startsWith('#')) return rgb;

  const result = rgb.match(/\d+/g);
  if (!result || result.length < 3) return undefined;

  const [r, g, b] = result.map((v) => parseInt(v, 10));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

/**
 * Transpiles TSX content to JavaScript
 */
const transpileTsx = (content: string, sourceName?: string | null) => {
  const primaryName = sourceName || 'inline.tsx';
  const fallbackName = primaryName.match(/\.tsx$|\.jsx$/i)
    ? null
    : `${primaryName.replace(/\.[^.]+$/, '')}.tsx`;
  const candidates = [primaryName, fallbackName].filter(Boolean) as string[];
  const errors: string[] = [];

  // First attempt a light sanitization for common JSX text mistakes (e.g., leading ">" in text nodes)
  const sanitizedContent = sanitizeCommonJsxText(content);

  for (const fileName of candidates) {
    const result = ts.transpileModule(content, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        // Use a CJS-friendly resolver; "bundler" requires ESM modules and was tripping TSX parsing
        moduleResolution: ts.ModuleResolutionKind.Node10,
        jsx: ts.JsxEmit.React,
        isolatedModules: true,
        allowJs: true,
        allowImportingTsExtensions: true,
        experimentalDecorators: true,
        useDefineForClassFields: false,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
      fileName,
      reportDiagnostics: true,
    });

    // If the first pass fails and we modified the source, retry with the sanitized version
    const finalResult =
      result.diagnostics && result.diagnostics.length > 0 && sanitizedContent !== content
        ? ts.transpileModule(sanitizedContent, {
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.CommonJS,
            moduleResolution: ts.ModuleResolutionKind.Node10,
            jsx: ts.JsxEmit.ReactJSX,
            isolatedModules: true,
            allowJs: true,
            allowImportingTsExtensions: true,
            experimentalDecorators: true,
            useDefineForClassFields: false,
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
          },
          fileName,
          reportDiagnostics: true,
        })
        : result;

    if (!finalResult.diagnostics || finalResult.diagnostics.length === 0) {
      return finalResult.outputText;
    }

    const first = finalResult.diagnostics[0];
    const message = ts.flattenDiagnosticMessageText(first.messageText, '\n');
    const suggestion = buildFriendlyHint(message, first);
    if (first.file && typeof first.start === 'number') {
      const { line, character } = ts.getLineAndCharacterOfPosition(first.file, first.start);
      const lineText = first.file.text.split(/\r?\n/)[line] || '';
      errors.push(
        `TSX parse error: ${message} (at ${fileName}:${line + 1}:${character + 1})\n> ${line + 1
        } | ${lineText.trimEnd()}${suggestion ? `\nSuggestion: ${suggestion}` : ''}`,
      );
    } else {
      errors.push(`TSX parse error: ${message}${suggestion ? `\nSuggestion: ${suggestion}` : ''}`);
    }
  }

  throw new Error(errors[0] || 'TSX parse error: Unknown issue');
};

/**
 * Light heuristic fixer: wraps text starting with ">" in JSX text nodes and escapes stray "&"
 */
const sanitizeCommonJsxText = (source: string) => {
  const fixText = (text: string) => {
    let updated = text.replace(/(^|\s)>(?=\S)/g, (_m, prefix) => `${prefix}{'>'}`);
    updated = updated.replace(/(^|\s)&(?![a-zA-Z#]+;)(?=\S)/g, (_m, prefix) => `${prefix}&amp;`);
    return updated;
  };

  return source.replace(/>([^<]+)</g, (full, textContent) => {
    const fixed = fixText(textContent);
    return `>${fixed}<`;
  });
};

/**
 * Produces user-friendly hints for common JSX syntax issues
 */
const buildFriendlyHint = (message: string, diagnostic: ts.Diagnostic) => {
  const pos = typeof diagnostic.start === 'number' ? diagnostic.start : null;

  const lineText =
    pos !== null && diagnostic.file
      ? diagnostic.file.text.split(/\r?\n/)[ts.getLineAndCharacterOfPosition(diagnostic.file, pos).line] || ''
      : '';

  if (message.includes('Unexpected token') && lineText.trimStart().startsWith('>')) {
    return 'Wrap literal ">" text as {\">\"} or &gt; inside JSX.';
  }

  if (message.toLowerCase().includes('unterminated string')) {
    return 'Check for missing closing quotes in JSX attributes or text.';
  }

  return '';
};

/**
 * Creates a require function for module resolution
 */
const createRequire = () => {
  const cache: Record<string, any> = {};
  return (moduleName: string) => {
    if (moduleName === 'react') return React;
    if (moduleName === 'react-dom' || moduleName === 'react-dom/client') return ReactDOM;
    if (cache[moduleName]) return cache[moduleName];

    const mock = createMockLibrary(moduleName);
    cache[moduleName] = mock;
    return mock;
  };
};

/**
 * Creates a mock library for unknown imports
 */
const createMockLibrary = (_moduleName: string) => {
  const MockComponent = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  return new Proxy(MockComponent, {
    get: () => MockComponent,
  });
};

/**
 * Resolves the React component from exports
 */
const resolveComponent = (exportsObj: Record<string, any>) => {
  if (typeof exportsObj.default === 'function') return exportsObj.default;
  const firstFn = Object.values(exportsObj).find((value) => typeof value === 'function');
  return firstFn;
};
