/**
 * Layout Engine
 * 
 * Transpiles TSX content and extracts layout information for PDF/PPTX generation.
 * Uses the enhanced DOM walker for accurate element extraction.
 */

import React from 'react';
import * as ReactDOM from 'react-dom/client';
import { flushSync } from 'react-dom';
import * as ts from 'typescript';
import { DocumentLayout, ExportFormat, LayoutElement, PageLayout, ProjectContext, LayoutDiagnostics, RenderSnapshot } from '../types';
import { walkDom, validateElements, LayoutItem, ShapeElement } from './domWalker';
import { TextElement } from './textExtractor';
import { ExtractedImage } from './imageExtractor';
import { paginateLayoutItems } from './pageBreaker';
import { rgbToHex } from './colorUtils';

const CONTAINER_WIDTH = 1280;
const CONTAINER_HEIGHT = 720;

const transpileCache = new Map<string, string>();
const runnerCache = new Map<string, Function>();
const MAX_TRANSPILE_CACHE = 8;
const MAX_RUNNER_CACHE = 8;

export interface ParseRequest {
  content: string;
  format: ExportFormat;
  sourceName?: string | null;
  forceSinglePage?: boolean;
  maxPages?: number;
  project?: ProjectContext;
}

const hashString = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
};

const waitForNextFrame = () => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
  let timer: number | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = window.setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) window.clearTimeout(timer);
  }
};

const waitForFonts = async (timeoutMs: number) => {
  const fonts = (document as any).fonts as FontFaceSet | undefined;
  if (!fonts?.ready) return;
  await withTimeout(fonts.ready as Promise<any>, timeoutMs, undefined);
};

const waitForImages = async (container: HTMLElement, timeoutMs: number) => {
  const imgs = Array.from(container.querySelectorAll('img'));
  if (imgs.length === 0) return;

  const tasks = imgs.map(async (img) => {
    if (img.complete && img.naturalWidth > 0) return;
    if (typeof (img as any).decode === 'function') {
      try {
        await (img as any).decode();
        return;
      } catch {
      }
    }
    await new Promise<void>((resolve) => {
      const cleanup = () => {
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onError);
      };
      const onLoad = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        resolve();
      };
      img.addEventListener('load', onLoad, { once: true });
      img.addEventListener('error', onError, { once: true });
    });
  });

  await withTimeout(Promise.all(tasks).then(() => undefined), timeoutMs, undefined);
};

const settleLayout = async (container: HTMLElement) => {
  await waitForNextFrame();
  await waitForFonts(1200);
  await waitForImages(container, 1400);
  await waitForNextFrame();
};

/**
 * Main entry point: parses TSX content and returns a document layout
 */
export const parseTsxToLayout = async ({ content, format, sourceName, forceSinglePage, maxPages, project }: ParseRequest): Promise<DocumentLayout> => {
  const host = document.getElementById('analysis-container');
  if (!host) {
    throw new Error('Hidden analysis container missing from DOM.');
  }

  const projectUsesClassName = project?.files
    ? Object.values(project.files).some((file) => file.kind === 'text' && /\bclassName\s*=/.test(file.content))
    : false;

  const diagnostics: LayoutDiagnostics = {
    missingImports: [],
    usedClassName: /\bclassName\s*=/.test(content) || projectUsesClassName,
    hasCss: Boolean(project?.hasCss),
    warnings: [],
  };

  // Prepare shadow sandbox so project CSS does not leak into the app UI
  Object.assign(host.style, {
    position: 'absolute',
    width: '0px',
    height: '0px',
    overflow: 'hidden',
    top: '0',
    left: '0',
  });
  const shadowRoot = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  shadowRoot.innerHTML = '';

  const styleTag = document.createElement('style');
  styleTag.textContent = `
    :host { all: initial; }
    #analysis-stage {
      position: absolute;
      left: -9999px;
      top: -9999px;
      width: ${CONTAINER_WIDTH}px;
      height: ${CONTAINER_HEIGHT}px;
      overflow: auto;
      visibility: visible;
      pointer-events: none;
      background: #ffffff;
      color: #000000;
      color-scheme: light;
      font-family: Arial, sans-serif;
    }
    #analysis-stage *, #analysis-stage *::before, #analysis-stage *::after {
      box-sizing: border-box;
    }
  `;
  shadowRoot.appendChild(styleTag);

  if (project?.cssText) {
    const projectStyle = document.createElement('style');
    projectStyle.textContent = project.cssText;
    shadowRoot.appendChild(projectStyle);
  }

  const container = document.createElement('div');
  container.id = 'analysis-stage';
  shadowRoot.appendChild(container);

  // Normalize the hidden stage so measurements are consistent even if external CSS fails to load
  Object.assign(container.style, {
    all: 'initial', // Reset all inherited styles
    position: 'absolute',
    left: '-9999px',
    top: '-9999px',
    width: `${CONTAINER_WIDTH}px`,
    height: `${CONTAINER_HEIGHT}px`,
    overflow: 'auto',
    visibility: 'visible',
    pointerEvents: 'none',
    background: '#ffffff',
    color: '#000000',
    colorScheme: 'light',
    fontFamily: 'Arial, sans-serif',
  });

  // Transpile TSX to JavaScript
  const transpileKey = `${sourceName || 'inline'}:${hashString(content)}`;
  if (transpileCache.size > MAX_TRANSPILE_CACHE) transpileCache.clear();
  const transpiled = transpileCache.get(transpileKey) ?? transpileTsx(content, sourceName);
  transpileCache.set(transpileKey, transpiled);

  // Create module scope for execution
  const module: { exports: Record<string, any> } = { exports: {} };
  const require = createRequire(project, diagnostics, sourceName);
  const runnerKey = hashString(transpiled);
  if (runnerCache.size > MAX_RUNNER_CACHE) runnerCache.clear();
  const runner = runnerCache.get(runnerKey) ?? new Function('require', 'module', 'exports', 'React', 'ReactDOM', transpiled);
  runnerCache.set(runnerKey, runner);

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
    flushSync(() => {
      root.render(React.createElement(Component));
    });
  } catch (err: any) {
    root.unmount();
    throw new Error(`Render failed: ${err?.message || err}`);
  }

  try {
    await settleLayout(container);
    const pseudoCount = countPseudoElements(container);
    if (pseudoCount > 0) {
      diagnostics.warnings.push(`${pseudoCount} element(s) use ::before/::after which may not export as vectors.`);
    }
    const layout = await extractLayoutEnhanced(
      container,
      format,
      sourceName || 'TSX Capture',
      { forceSinglePage, maxPages }
    );
    layout.diagnostics = diagnostics;

    if (diagnostics.usedClassName && !diagnostics.hasCss) {
      diagnostics.warnings.push('Detected className usage, but no project CSS was provided.');
    }
    if (diagnostics.missingImports.length > 0) {
      diagnostics.warnings.push(`Unresolved imports: ${diagnostics.missingImports.join(', ')}`);
    }

    const snapshot = buildSnapshot(container, project?.cssText, layout.pages[0]?.bgColor || '#ffffff');
    layout.snapshot = snapshot;
    return layout;
  } finally {
    root.unmount();
  }
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

const countPseudoElements = (container: HTMLElement): number => {
  const elements = Array.from(container.querySelectorAll('*'));
  let count = 0;
  elements.forEach((element) => {
    const before = window.getComputedStyle(element, '::before');
    const after = window.getComputedStyle(element, '::after');
    if ((before && before.content && before.content !== 'none') || (after && after.content && after.content !== 'none')) {
      count += 1;
    }
  });
  return count;
};

const buildSnapshot = (container: HTMLElement, cssText: string | undefined, bgColor: string): RenderSnapshot => {
  const html = container.innerHTML;
  return {
    html,
    cssText: cssText || '',
    width: CONTAINER_WIDTH,
    height: CONTAINER_HEIGHT,
    contentHeight: container.scrollHeight || CONTAINER_HEIGHT,
    bgColor,
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
      isLine: textItem.isLine,
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

// rgbToHex removed and imported from colorUtils

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
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      jsx: ts.JsxEmit.React,
      isolatedModules: true,
      allowJs: true,
      allowImportingTsExtensions: true,
      experimentalDecorators: true,
      useDefineForClassFields: false,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
    };

    const result = ts.transpileModule(content, {
      compilerOptions: {
        ...compilerOptions,
      },
      fileName,
      reportDiagnostics: true,
    });

    // If the first pass fails and we modified the source, retry with the sanitized version
    const finalResult =
      result.diagnostics && result.diagnostics.length > 0 && sanitizedContent !== content
        ? ts.transpileModule(sanitizedContent, {
          compilerOptions: {
            ...compilerOptions,
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
const createRequire = (project: ProjectContext | undefined, diagnostics: LayoutDiagnostics, entryName?: string | null) => {
  const cache: Record<string, any> = {};
  const files = project?.files || {};
  const entryPath = entryName ? normalizePath(entryName) : project?.entryPath;

  const resolveModule = (moduleName: string, fromPath?: string): string | null => {
    if (moduleName.startsWith('.') || moduleName.startsWith('/')) {
      const baseDir = fromPath ? dirname(fromPath) : '';
      const resolved = normalizePath(joinPath(baseDir, moduleName));
      return resolveWithExtensions(resolved, files);
    }

    return null;
  };

  const loadModule = (filePath: string): any => {
    if (cache[filePath]) return cache[filePath];
    const file = files[filePath];
    if (!file || file.kind !== 'text') return null;

    const module = { exports: {} as Record<string, any> };
    if (filePath.endsWith('.json')) {
      try {
        module.exports = JSON.parse(file.content);
        cache[filePath] = module.exports;
        return module.exports;
      } catch (err) {
        throw new Error(`Failed to parse JSON module ${filePath}: ${String(err)}`);
      }
    }
    const transpiled = transpileTsx(file.content, filePath);
    const runnerKey = hashString(`${filePath}:${transpiled}`);
    const runner = runnerCache.get(runnerKey) ?? new Function('require', 'module', 'exports', 'React', 'ReactDOM', transpiled);
    runnerCache.set(runnerKey, runner);
    const localRequire = (mod: string) => requireWithContext(mod, filePath);
    runner(localRequire, module, module.exports, React, ReactDOM);
    cache[filePath] = module.exports;
    return module.exports;
  };

  const requireWithContext = (moduleName: string, fromPath?: string) => {
    if (moduleName === 'react') return React;
    if (moduleName === 'react-dom' || moduleName === 'react-dom/client') return ReactDOM;

    const resolved = resolveModule(moduleName, fromPath || entryPath || undefined);
    if (resolved) {
      if (resolved.endsWith('.css')) return null;
      if (isAssetFile(resolved, files)) {
        return files[resolved].content;
      }
      const loaded = loadModule(resolved);
      if (loaded) return loaded;
    }

    if (!diagnostics.missingImports.includes(moduleName)) {
      diagnostics.missingImports.push(moduleName);
    }

    const mock = createMockLibrary(moduleName);
    cache[moduleName] = mock;
    return mock;
  };

  return (moduleName: string) => requireWithContext(moduleName, entryPath || undefined);
};

/**
 * Creates a mock library for unknown imports
 */
const createMockLibrary = (_moduleName: string) => {
  const MockComponent = ({
    children,
    size,
    width,
    height,
  }: {
    children?: React.ReactNode;
    size?: number;
    width?: number;
    height?: number;
  }) =>
    React.createElement('span', {
      style: {
        display: 'inline-block',
        width: size || width || 24,
        height: size || height || 24,
      },
      children,
    });
  return new Proxy(MockComponent, {
    get: () => MockComponent,
  });
};

const normalizePath = (value: string) => {
  const cleaned = value.replace(/\\/g, '/').replace(/^\.\/+/, '').replace(/^\/+/, '');
  return cleaned ? `/${cleaned}` : '/';
};

const joinPath = (base: string, next: string) => {
  if (!base) return next;
  if (next.startsWith('/')) return next;
  return `${base.replace(/\/$/, '')}/${next}`;
};

const dirname = (filePath: string) => filePath.split('/').slice(0, -1).join('/');

const resolveWithExtensions = (basePath: string, files: ProjectContext['files']) => {
  const candidates = [
    basePath,
    `${basePath}.tsx`,
    `${basePath}.ts`,
    `${basePath}.jsx`,
    `${basePath}.js`,
    `${basePath}.css`,
    `${basePath}.json`,
    `${basePath}.svg`,
    `${basePath}.png`,
    `${basePath}.jpg`,
    `${basePath}.jpeg`,
    `${basePath}.gif`,
    `${basePath}.webp`,
  ];
  for (const candidate of candidates) {
    if (files[normalizePath(candidate)]) {
      return normalizePath(candidate);
    }
  }
  return null;
};

const isAssetFile = (filePath: string, files: ProjectContext['files']) => {
  const file = files[filePath];
  return file && file.kind === 'binary';
};

/**
 * Resolves the React component from exports
 */
const resolveComponent = (exportsObj: Record<string, any>) => {
  if (typeof exportsObj.default === 'function') return exportsObj.default;
  const firstFn = Object.values(exportsObj).find((value) => typeof value === 'function');
  return firstFn;
};
