/**
 * Rasterizer Service
 *
 * Converts a DOM snapshot into raster images using SVG foreignObject.
 * Used as a fallback when vector export fidelity is unreliable.
 */

import { RenderSnapshot } from '../types';

const buildSvg = (snapshot: RenderSnapshot, pageIndex: number, scale: number) => {
  const width = snapshot.width * scale;
  const height = snapshot.height * scale;
  const offset = snapshot.height * pageIndex;

  const escapedCss = snapshot.cssText.replace(/<\/style>/g, '</sty' + 'le>');
  const html = snapshot.html;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:hidden;background:${snapshot.bgColor};font-family: Arial, sans-serif;color:#000;">
      <style>${escapedCss}</style>
      <div style="transform: translateY(-${offset * scale}px); width:${snapshot.width * scale}px; height:${snapshot.contentHeight * scale}px; transform-origin: top left;">
        ${html}
      </div>
    </div>
  </foreignObject>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

export const rasterizePage = async (
  snapshot: RenderSnapshot,
  pageIndex: number,
  scale: number
): Promise<string> => {
  const svgUrl = buildSvg(snapshot, pageIndex, scale);
  const img = await loadImage(svgUrl);
  const canvas = document.createElement('canvas');
  canvas.width = snapshot.width * scale;
  canvas.height = snapshot.height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to acquire canvas 2D context for rasterization.');
  }
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/png');
};

export const rasterizeAllPages = async (
  snapshot: RenderSnapshot,
  pageCount: number,
  scale: number
): Promise<string[]> => {
  const results: string[] = [];
  for (let i = 0; i < pageCount; i += 1) {
    const dataUrl = await rasterizePage(snapshot, i, scale);
    results.push(dataUrl);
  }
  return results;
};
