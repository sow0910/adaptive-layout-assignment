/**
 * Adaptive Layout Engine - DOM/CSS Renderer
 * 
 * Takes a ResolvedLayout computed by resolver.ts and renders it into React DOM elements
 * using absolute pixel positioning derived directly from the resolver output.
 * Absolutely NO media queries or CSS breakpoints are used for layout placement.
 */

import React from 'react';
import { ResolvedLayout, ResolvedBox } from './resolver';

interface RenderDomProps {
  layout: ResolvedLayout;
  showBoundingBoxes?: boolean;
  onElementHover?: (box: ResolvedBox | null) => void;
}

export const DomRenderer: React.FC<RenderDomProps> = ({
  layout,
  showBoundingBoxes = false,
  onElementHover,
}) => {
  const { surfaceWidth, surfaceHeight, usableBounds, boxes } = layout;

  return (
    <div
      className="ad-surface-container"
      style={{
        position: 'relative',
        width: `${surfaceWidth}px`,
        height: `${surfaceHeight}px`,
        overflow: 'hidden',
        boxSizing: 'border-box',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #15091e 0%, #200d2b 50%, #110719 100%)',
        boxShadow: '0 20px 45px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(236,72,153,0.25)',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
        userSelect: 'none',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Safe Area Guide Overlay */}
      {showBoundingBoxes && (
        <div
          className="safe-area-overlay"
          style={{
            position: 'absolute',
            left: `${usableBounds.x}px`,
            top: `${usableBounds.y}px`,
            width: `${usableBounds.width}px`,
            height: `${usableBounds.height}px`,
            border: '1.5px dashed rgba(236, 72, 153, 0.6)',
            backgroundColor: 'rgba(236, 72, 153, 0.04)',
            pointerEvents: 'none',
            zIndex: 1,
            boxSizing: 'border-box',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: '4px',
              left: '6px',
              fontSize: '10px',
              fontFamily: "'JetBrains Mono', monospace",
              color: '#f472b6',
              fontWeight: 700,
            }}
          >
            SAFE AREA ({usableBounds.width}x{usableBounds.height})
          </span>
        </div>
      )}

      {/* Render Individual Resolved Boxes */}
      {Object.values(boxes).map((box) => {
        if (!box.visible) return null;

        return (
          <div
            key={box.id}
            className={`ad-element-box ad-element-${box.role} ${box.degraded ? 'is-degraded' : ''}`}
            onMouseEnter={() => onElementHover && onElementHover(box)}
            onMouseLeave={() => onElementHover && onElementHover(null)}
            style={{
              position: 'absolute',
              left: `${box.x}px`,
              top: `${box.y}px`,
              width: `${box.width}px`,
              height: `${box.height}px`,
              zIndex: box.zIndex,
              boxSizing: 'border-box',
              transition: 'all 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
              outline: showBoundingBoxes
                ? box.degraded
                  ? '2px solid rgba(245, 158, 11, 0.85)'
                  : '1.5px solid rgba(236, 72, 153, 0.65)'
                : 'none',
            }}
          >
            {/* Branding Logo (Apple) */}
            {box.role === 'branding' && (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    padding: '4px 14px',
                    borderRadius: '20px',
                    background: 'rgba(236, 72, 153, 0.18)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(236, 72, 153, 0.35)',
                    color: '#ffffff',
                    fontWeight: 800,
                    letterSpacing: '1px',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(236, 72, 153, 0.25)',
                  }}
                >
                  <span style={{ color: '#f472b6', fontSize: '13px' }}></span> APPLE
                </div>
              </div>
            )}

            {/* Hero Product Image (MacBook Pro) */}
            {box.role === 'hero' && box.src && (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  position: 'relative',
                  boxShadow: '0 16px 36px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.15)',
                }}
              >
                <img
                  src={box.src}
                  alt="MacBook Pro Midnight Blue"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(17, 7, 25, 0.5) 0%, transparent 60%)',
                  }}
                />
              </div>
            )}

            {/* Primary Headline */}
            {box.role === 'primary' && (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: `${box.fontSize || 20}px`,
                  lineHeight: 1.15,
                  letterSpacing: '-0.02em',
                  textShadow: '0 2px 12px rgba(0,0,0,0.8)',
                }}
              >
                {box.content}
              </div>
            )}

            {/* Secondary Copy / Price */}
            {box.role === 'secondary' && (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  color: box.degraded ? '#fcd34d' : '#f472b6',
                  fontWeight: 700,
                  fontSize: `${box.fontSize || 14}px`,
                  whiteSpace: box.truncated ? 'nowrap' : 'normal',
                  overflow: 'hidden',
                  textOverflow: box.truncated ? 'ellipsis' : 'clip',
                }}
              >
                {box.content}
              </div>
            )}

            {/* Action CTA Button (Hot Pink Gradient) */}
            {box.role === 'action' && (
              <button
                type="button"
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: `${box.fontSize || 15}px`,
                  cursor: 'pointer',
                  boxShadow: '0 8px 22px rgba(236, 72, 153, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  letterSpacing: '-0.01em',
                }}
              >
                {box.content}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Debug Inspector Label */}
            {showBoundingBoxes && (
              <div
                style={{
                  position: 'absolute',
                  top: '-18px',
                  left: '0',
                  background: box.degraded ? '#d97706' : '#db2777',
                  color: '#ffffff',
                  fontSize: '9px',
                  fontFamily: "'JetBrains Mono', monospace",
                  padding: '1px 5px',
                  borderRadius: '3px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}
              >
                {box.id} ({Math.round(box.width)}x{Math.round(box.height)})
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};