import React, { useEffect, useRef } from 'react';

const CanvasSlide = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(160, 90, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f8c146';
    ctx.fillRect(250, 40, 120, 100);
  }, []);

  return (
    <div style={{ width: '1280px', height: '720px', backgroundColor: '#ffffff', padding: '40px' }}>
      <h1 style={{ marginBottom: '20px' }}>Canvas Diagram Test</h1>
      <canvas ref={canvasRef} width={520} height={240} style={{ borderRadius: '16px' }} />
    </div>
  );
};

export default CanvasSlide;
