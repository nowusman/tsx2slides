import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { DocumentLayout, LayoutElement, PageLayout } from '../types';

const BASE_WIDTH = 1280;

interface Props {
  layout: DocumentLayout;
}

const PreviewElement: React.FC<{ el: LayoutElement; scale: number }> = ({ el, scale }) => {
  if (el.imageData || el.type === 'image') {
    return (
      <div
        style={{
          position: 'absolute',
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          height: `${el.h}%`,
          overflow: 'hidden',
          borderRadius: el.radius ? `${el.radius * scale}px` : undefined,
        }}
      >
        <img
          src={el.imageData}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    );
  }

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
  const borderWidth = el.strokeWidthPx ? el.strokeWidthPx * scale : el.color && el.color !== el.bgColor ? 1.5 * scale : undefined;
  const borderStyle = el.borderStyle === 'dashed' ? 'dashed' : el.borderStyle === 'dotted' ? 'dotted' : 'solid';

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${el.x}%`,
    top: `${el.y}%`,
    width: `${el.w}%`,
    height: `${el.h}%`,
    backgroundColor: el.type === 'rect' || el.type === 'circle' ? el.bgColor : undefined,
    border: el.type !== 'text' && borderWidth ? `${borderWidth}px ${borderStyle} ${el.color || '#ffffff'}` : undefined,
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

interface SlidePreviewProps {
  page: PageLayout;
  zoom: number;
  onScaleChange?: (scale: number) => void;
}

const SlidePreview: React.FC<SlidePreviewProps> = ({ page, zoom, onScaleChange }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const lastFit = useRef<number>(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const updateScale = () => {
      const width = el.clientWidth;
      const fitValue = width / BASE_WIDTH;
      setScale(fitValue);
      if (onScaleChange && Math.abs(fitValue - lastFit.current) > 0.002) {
        lastFit.current = fitValue;
        onScaleChange(fitValue);
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const effectiveScale = scale * zoom;

  return (
    <div className="slide" ref={ref} style={{ backgroundColor: page.bgColor || '#fff' }}>
      {page.elements.map((el) => (
        <PreviewElement key={el.id} el={el} scale={effectiveScale} />
      ))}
      <div className="slide-number">Slide {page.pageNumber}</div>
    </div>
  );
};

export const LayoutPreview: React.FC<Props> = ({ layout }) => {
  const [zoom, setZoom] = useState(1);
  const [fitScale, setFitScale] = useState(1);

  const handleZoom = (delta: number) => {
    setZoom((prev) => {
      const next = Math.min(2, Math.max(0.5, parseFloat((prev + delta).toFixed(2))));
      return next;
    });
  };

  const handleFit = () => setZoom(1);

  return (
    <div className="layout-preview">
      <div className="preview-head">
        <div className="preview-title">Preview: {layout.title}</div>
        <div className="zoom-controls">
          <button className="ghost" onClick={() => handleZoom(-0.1)}>
            <ZoomOut size={14} />
          </button>
          <div className="zoom-readout">{Math.round(fitScale * zoom * 100)}%</div>
          <button className="ghost" onClick={() => handleZoom(0.1)}>
            <ZoomIn size={14} />
          </button>
          <button className="ghost" onClick={handleFit}>
            <Maximize2 size={14} />
            <span>Fit to width</span>
          </button>
        </div>
      </div>
      {layout.pages.map((page) => (
        <SlidePreview
          key={page.pageNumber}
          page={page}
          onScaleChange={(value) => setFitScale(value)}
          zoom={zoom}
        />
      ))}
      <div className="preview-footnote">
        {layout.pages.length} page{layout.pages.length > 1 ? 's' : ''} • {layout.summary}
      </div>
    </div>
  );
};
