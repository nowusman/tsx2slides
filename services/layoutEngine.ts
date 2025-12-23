import React from 'react';
import * as ReactDOM from 'react-dom/client';
import * as ts from 'typescript';
import { DocumentLayout, ExportFormat, LayoutElement, PageLayout } from '../types';

const CONTAINER_WIDTH = 1280;
const CONTAINER_HEIGHT = 720;

export interface ParseRequest {
  content: string;
  format: ExportFormat;
  sourceName?: string | null;
}

export const parseTsxToLayout = async ({ content, format, sourceName }: ParseRequest): Promise<DocumentLayout> => {
  const container = document.getElementById('analysis-container');
  if (!container) {
    throw new Error('Hidden analysis container missing from DOM.');
  }

  const transpiled = transpileTsx(content);

  const module: { exports: Record<string, any> } = { exports: {} };
  const require = createRequire();
  const runner = new Function('require', 'module', 'exports', 'React', 'ReactDOM', transpiled);

  try {
    runner(require, module, module.exports, React, ReactDOM);
  } catch (err: any) {
    throw new Error(`Compile or execution error: ${err?.message || err}`);
  }

  const Component = resolveComponent(module.exports);
  if (!Component) {
    throw new Error('No React component export detected. Export a component as default or named export.');
  }

  container.innerHTML = '';
  const root = ReactDOM.createRoot(container);

  try {
    root.render(React.createElement(Component));
  } catch (err: any) {
    root.unmount();
    throw new Error(`Render failed: ${err?.message || err}`);
  }

  return new Promise((resolve, reject) => {
    window.requestAnimationFrame(() => {
      // Give layout a brief moment to settle for fonts/images.
      setTimeout(() => {
        try {
          const layout = extractLayoutFromDom(container, format, sourceName || 'TSX Capture');
          root.unmount();
          resolve(layout);
        } catch (err) {
          root.unmount();
          reject(err);
        }
      }, 120);
    });
  });
};

const transpileTsx = (content: string) => {
  const result = ts.transpileModule(content, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2018,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
    },
    reportDiagnostics: true,
  });

  if (result.diagnostics && result.diagnostics.length > 0) {
    const first = result.diagnostics[0];
    const message = ts.flattenDiagnosticMessageText(first.messageText, '\n');
    throw new Error(`TSX parse error: ${message}`);
  }

  return result.outputText;
};

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

const createMockLibrary = (_moduleName: string) => {
  const MockComponent = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  return new Proxy(MockComponent, {
    get: () => MockComponent,
  });
};

const resolveComponent = (exportsObj: Record<string, any>) => {
  if (typeof exportsObj.default === 'function') return exportsObj.default;
  const firstFn = Object.values(exportsObj).find((value) => typeof value === 'function');
  return firstFn;
};

const extractLayoutFromDom = (container: HTMLElement, _format: ExportFormat, title: string): DocumentLayout => {
  const elements: LayoutElement[] = [];
  const containerRect = container.getBoundingClientRect();

  const toPercentRect = (rect: DOMRect) => ({
    x: ((rect.left - containerRect.left) / containerRect.width) * 100,
    y: ((rect.top - containerRect.top) / containerRect.height) * 100,
    w: (rect.width / containerRect.width) * 100,
    h: (rect.height / containerRect.height) * 100,
  });

  const rgbToHex = (rgb: string | null) => {
    if (!rgb || rgb === 'rgba(0, 0, 0, 0)' || rgb === 'transparent') return undefined;
    if (rgb.startsWith('#')) return rgb;
    const result = rgb.match(/\d+/g);
    if (!result || result.length < 3) return undefined;
    const [r, g, b] = result.map((v) => parseInt(v, 10));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const parseRadius = (radius: string) => {
    const numeric = parseFloat(radius);
    return Number.isFinite(numeric) ? numeric : undefined;
  };

  const sanitizeFontFamily = (family: string) => {
    if (!family) return undefined;
    const primary = family.split(',')[0]?.replace(/["']/g, '').trim();
    return primary || undefined;
  };

  const captureTextNodes = (node: HTMLElement, styles: CSSStyleDeclaration) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType !== Node.TEXT_NODE) return;
      const raw = child.textContent || '';
      const text = raw.replace(/\s+/g, ' ').trim();
      if (!text) return;

      const range = document.createRange();
      range.selectNodeContents(child);
      const rects = Array.from(range.getClientRects());

      rects.forEach((rect) => {
        if (rect.width < 0.5 || rect.height < 0.5) return;
        const pos = toPercentRect(rect);
        elements.push({
          id: `text-${Math.random().toString(36).slice(2)}`,
          type: 'text',
          text,
          x: pos.x,
          y: pos.y,
          w: pos.w,
          h: pos.h,
          color: rgbToHex(styles.color) || '#111111',
          fontSize: parseFloat(styles.fontSize) || 14,
          fontWeight: parseInt(styles.fontWeight, 10) >= 600 || styles.fontWeight === 'bold' ? 'bold' : 'normal',
          align: (styles.textAlign as LayoutElement['align']) || 'left',
          fontFamily: sanitizeFontFamily(styles.fontFamily),
          lineHeight: parseFloat(styles.lineHeight) || undefined,
        });
      });
    });
  };

  const captureBox = (node: HTMLElement, styles: CSSStyleDeclaration) => {
    const rect = node.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const opacity = parseFloat(styles.opacity);
    if (opacity === 0) return;
    if (styles.display === 'none' || styles.visibility === 'hidden') return;

    const bgColor = rgbToHex(styles.backgroundColor);
    const borderWidth = parseFloat(styles.borderWidth);
    const strokeColor = borderWidth > 0 ? rgbToHex(styles.borderColor) : undefined;

    if (!bgColor && !strokeColor) return;

    const pos = toPercentRect(rect);
    const radius = parseRadius(styles.borderRadius);
    const isCircle = styles.borderRadius.includes('%') && parseFloat(styles.borderRadius) >= 45;

    elements.push({
      id: `shape-${Math.random().toString(36).slice(2)}`,
      type: isCircle ? 'circle' : 'rect',
      x: pos.x,
      y: pos.y,
      w: pos.w,
      h: pos.h,
      color: strokeColor || bgColor || '#111111',
      bgColor,
      opacity: Number.isFinite(opacity) ? opacity : 1,
      radius: isCircle ? undefined : radius,
    });
  };

  const walk = (node: HTMLElement) => {
    if (node === container) {
      Array.from(node.children).forEach((child) => child instanceof HTMLElement && walk(child));
      return;
    }

    const styles = window.getComputedStyle(node);
    captureBox(node, styles);
    captureTextNodes(node, styles);

    Array.from(node.children).forEach((child) => {
      if (child instanceof HTMLElement) {
        walk(child);
      }
    });
  };

  const firstChild = container.firstElementChild;
  if (firstChild && firstChild instanceof HTMLElement) {
    walk(firstChild);
  }

  const pages: PageLayout[] = [];
  const contentHeight = container.scrollHeight || CONTAINER_HEIGHT;
  const pageHeight = CONTAINER_HEIGHT;
  const totalPages = Math.max(1, Math.ceil(contentHeight / pageHeight));

  for (let i = 0; i < totalPages; i++) {
    const pageTop = i * 100;
    const pageBottom = (i + 1) * 100;

    const pageElements = elements
      .filter((el) => {
        const centerY = el.y + el.h / 2;
        return centerY >= pageTop && centerY < pageBottom;
      })
      .map((el) => ({
        ...el,
        y: el.y - pageTop,
      }));

    pages.push({
      pageNumber: i + 1,
      bgColor: '#ffffff',
      elements: pageElements,
    });
  }

  return {
    title,
    summary: `${pages.length} page${pages.length > 1 ? 's' : ''} captured offline`,
    pages,
  };
};
