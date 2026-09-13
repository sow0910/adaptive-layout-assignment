/**
 * Adaptive Layout Engine - Canvas 2D Backend Renderer
 * 
 * Demonstrates complete decoupling of the resolution algorithm from DOM/React.
 * Renders the exact same ResolvedLayout onto an HTML5 <canvas> element using 2D context primitives.
 * Strictly mirrors the MacBook Pro ad spec rendered by the DOM renderer.
 */

import React, { useEffect, useRef } from 'react';
import { ResolvedLayout } from './resolver';

interface CanvasRendererProps {
  layout: ResolvedLayout;
  showBoundingBoxes?: boolean;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  layout,
  showBoundingBoxes = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { surfaceWidth, surfaceHeight, usableBounds, boxes } = layout;

    // Handle high DPI Retina displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = surfaceWidth * dpr;
    canvas.height = surfaceHeight * dpr;
    ctx.scale(dpr, dpr);

    // 1. Draw Pink Studio Background Gradient
    const bgGradient = ctx.createLinearGradient(0, 0, surfaceWidth, surfaceHeight);
    bgGradient.addColorStop(0, '#15091e');
    bgGradient.addColorStop(0.5, '#200d2b');
    bgGradient.addColorStop(1, '#110719');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, surfaceWidth, surfaceHeight);

    // 2. Draw Safe Area Guide Overlay
    if (showBoundingBoxes) {
      ctx.save();
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(usableBounds.x, usableBounds.y, usableBounds.width, usableBounds.height);
      
      ctx.fillStyle = '#f472b6';
      ctx.font = "600 10px 'JetBrains Mono', monospace";
      ctx.fillText(`SAFE AREA (${usableBounds.width}x${usableBounds.height})`, usableBounds.x + 6, usableBounds.y + 14);
      ctx.restore();
    }

    // 3. Render Boxes
    Object.values(boxes).forEach((box) => {
      if (!box.visible) return;

      ctx.save();

      // Draw Debug Bounds
      if (showBoundingBoxes) {
        ctx.strokeStyle = box.degraded ? 'rgba(245, 158, 11, 0.85)' : 'rgba(236, 72, 153, 0.65)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Debug Label
        ctx.fillStyle = box.degraded ? '#d97706' : '#db2777';
        ctx.fillRect(box.x, box.y - 16, Math.min(box.width, 120), 16);
        ctx.fillStyle = '#ffffff';
        ctx.font = "600 9px 'JetBrains Mono', monospace";
        ctx.fillText(box.id, box.x + 4, box.y - 4);
      }

      // Branding Logo (Apple)
      if (box.role === 'branding') {
        ctx.fillStyle = 'rgba(236, 72, 153, 0.18)';
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.35)';
        ctx.lineWidth = 1;
        roundRect(ctx, box.x, box.y, box.width, box.height, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = "700 11px 'Plus Jakarta Sans', sans-serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(' APPLE', box.x + box.width / 2, box.y + box.height / 2);
      }

      // Hero Product Media (MacBook Pro Midnight)
      else if (box.role === 'hero') {
        const heroGradient = ctx.createLinearGradient(box.x, box.y, box.x + box.width, box.y + box.height);
        heroGradient.addColorStop(0, '#1e1b4b');
        heroGradient.addColorStop(1, '#0f172a');
        ctx.fillStyle = heroGradient;
        roundRect(ctx, box.x, box.y, box.width, box.height, 12);
        ctx.fill();

        ctx.fillStyle = '#f472b6';
        ctx.font = "600 13px 'Plus Jakarta Sans', sans-serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💻 MacBook Pro Midnight', box.x + box.width / 2, box.y + box.height / 2);
      }

      // Primary Headline (MacBook Pro M3)
      else if (box.role === 'primary') {
        ctx.fillStyle = '#ffffff';
        ctx.font = `800 ${box.fontSize || 20}px 'Plus Jakarta Sans', sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(box.content || 'MacBook Pro M3', box.x, box.y + box.height / 2);
      }

      // Secondary Copy / Price (Midnight • M3 Max Chip)
      else if (box.role === 'secondary') {
        ctx.fillStyle = box.degraded ? '#fcd34d' : '#f472b6';
        ctx.font = `600 ${box.fontSize || 14}px 'Plus Jakarta Sans', sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const text = box.truncated ? `${(box.content || 'Midnight • M3 Max Chip').substring(0, 10)}...` : box.content || 'Midnight • M3 Max Chip';
        ctx.fillText(text, box.x, box.y + box.height / 2);
      }

      // Action CTA Button (Buy MacBook Pro)
      else if (box.role === 'action') {
        const ctaGradient = ctx.createLinearGradient(box.x, box.y, box.x + box.width, box.y + box.height);
        ctaGradient.addColorStop(0, '#ec4899');
        ctaGradient.addColorStop(1, '#db2777');
        ctx.fillStyle = ctaGradient;
        roundRect(ctx, box.x, box.y, box.width, box.height, 12);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = `800 ${box.fontSize || 15}px 'Plus Jakarta Sans', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${box.content || 'Buy MacBook Pro'} →`, box.x + box.width / 2, box.y + box.height / 2);
      }

      ctx.restore();
    });
  }, [layout, showBoundingBoxes]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: `${layout.surfaceWidth}px`,
        height: `${layout.surfaceHeight}px`,
        borderRadius: '16px',
        boxShadow: '0 20px 45px rgba(0,0,0,0.6)',
        display: 'block',
      }}
    />
  );
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}