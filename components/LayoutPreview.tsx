import React, { useEffect, useRef, useState } from 'react';
import { DocumentLayout, LayoutElement, PageLayout } from '../types';

const BASE_WIDTH = 1280;

interface Props {
  layout: DocumentLayout;
}

const PreviewElement: React.FC<{ el: LayoutElement; scale: number }> = ({ el, scale }) => {
  if (el.type === 'line') {
    return (
      <div
        style={{
          position: 'absolute',
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          height: `${el.h}%`,
          opacity: el.opacity ?? 1,
        }}
      >
        <svg width="100%" height="100%" preserveAspectRatio="none">
          <line x1="0" y1="0" x2="100%" y2="100%" stroke={el.color} strokeWidth={2 * scale} />
        </svg>
      </div>
    );
  }

  const fontSize = (el.fontSize || 14) * scale;
  const borderRadius = el.type === 'rect' ? (el.radius ? `${el.radius * scale}px` : '6px') : el.type === 'circle' ? '50%' : undefined;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${el.x}%`,
    top: `${el.y}%`,
    width: `${el.w}%`,
    height: `${el.h}%`,
    backgroundColor: el.type === 'rect' || el.type === 'circle' ? el.bgColor : undefined,
    border: el.type === 'rect' && el.color && el.color !== el.bgColor ? `1.5px solid ${el.color}` : undefined,
    borderRadius,
    color: el.color,
    fontSize: `${fontSize}px`,
    fontWeight: el.fontWeight,
    textAlign: el.align,
    fontFamily: el.fontFamily || 'Segoe UI, Arial, sans-serif',
    lineHeight: el.lineHeight ? `${el.lineHeight * scale}px` : undefined,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start',
    overflow: 'hidden',
    zIndex: 1,
    opacity: el.opacity ?? 1,
    padding: el.type === 'text' ? '2px 4px' : undefined,
    boxSizing: 'border-box',
  };

  return <div style={style}>{el.text && <span>{el.text}</span>}</div>;
};

const SlidePreview: React.FC<{ page: PageLayout }> = ({ page }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const updateScale = () => {
      const width = el.clientWidth;
      setScale(width / BASE_WIDTH);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="slide" ref={ref} style={{ backgroundColor: page.bgColor || '#fff' }}>
      {page.elements.map((el) => (
        <PreviewElement key={el.id} el={el} scale={scale} />
      ))}
      <div className="slide-number">Slide {page.pageNumber}</div>
    </div>
  );
};

export const LayoutPreview: React.FC<Props> = ({ layout }) => {
  return (
    <div className="layout-preview">
      <div className="preview-title">Preview: {layout.title}</div>
      {layout.pages.map((page) => (
        <SlidePreview key={page.pageNumber} page={page} />
      ))}
      <div className="preview-footnote">
        {layout.pages.length} page{layout.pages.length > 1 ? 's' : ''} • {layout.summary}
      </div>
    </div>
  );
};
