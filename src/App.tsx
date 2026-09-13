import React, { useState, useMemo } from 'react';
import { defaultAdSpec, AdSpec } from './spec';
import { standardSurfaces, SurfaceProfile } from './surfaces';
import { resolveLayout, ResolvedBox } from './resolver';
import { DomRenderer } from './render-dom';
import { CanvasRenderer } from './render-canvas';
import { 
  Layers, 
  Smartphone, 
  Monitor, 
  Tv, 
  Square, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  Code2, 
  Activity,
  Maximize2
} from 'lucide-react';

export const App: React.FC = () => {
  // State
  const [selectedSurfaceKey, setSelectedSurfaceKey] = useState<string>('mobileInterstitial');
  const [rendererType, setRendererType] = useState<'dom' | 'canvas'>('dom');
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'telemetry' | 'spec' | 'sandbox'>('telemetry');
  const [hoveredBox, setHoveredBox] = useState<ResolvedBox | null>(null);

  // Custom 5th Surface Builder State
  const [customWidth, setCustomWidth] = useState<number>(450);
  const [customHeight, setCustomHeight] = useState<number>(600);
  const [customTopSafe, setCustomTopSafe] = useState<number>(20);
  const [customBottomSafe, setCustomBottomSafe] = useState<number>(20);
  const [customSideSafe, setCustomSideSafe] = useState<number>(20);
  const [customMinTap, setCustomMinTap] = useState<number>(44);
  const [customMinText, setCustomMinText] = useState<number>(14);
  const [customViewing, setCustomViewing] = useState<'near' | 'medium' | 'far'>('near');

  // Compute Active Surface Profile
  const activeSurface: SurfaceProfile = useMemo(() => {
    if (selectedSurfaceKey === 'custom') {
      return {
        id: 'customSurface',
        name: 'Custom Surface Sandbox',
        description: 'User-configured custom surface dimensions & constraints.',
        width: customWidth,
        height: customHeight,
        safeArea: {
          top: customTopSafe,
          bottom: customBottomSafe,
          left: customSideSafe,
          right: customSideSafe,
        },
        minTapTarget: customMinTap,
        minTextSize: customMinText,
        viewingDistance: customViewing,
        touchOnly: customMinTap > 0,
      };
    }
    return standardSurfaces[selectedSurfaceKey] || standardSurfaces.mobileInterstitial;
  }, [
    selectedSurfaceKey,
    customWidth,
    customHeight,
    customTopSafe,
    customBottomSafe,
    customSideSafe,
    customMinTap,
    customMinText,
    customViewing,
  ]);

  // Execute Resolver Algorithm
  const resolvedLayout = useMemo(() => {
    return resolveLayout(defaultAdSpec, activeSurface);
  }, [activeSurface]);

  // Calculate viewport zoom scale for large surfaces (e.g. 1920x250 or 1080x1080)
  const previewScale = useMemo(() => {
    const maxW = 860;
    const maxH = 580;
    const wRatio = activeSurface.width > maxW ? maxW / activeSurface.width : 1;
    const hRatio = activeSurface.height > maxH ? maxH / activeSurface.height : 1;
    return Math.min(wRatio, hRatio, 1);
  }, [activeSurface.width, activeSurface.height]);

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Studio Header Bar */}
      <header
        className="glass-panel"
        style={{
          margin: '16px 24px 0 24px',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
            }}
          >
            <Layers size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', color: '#f8fafc' }}>
              Adaptive Layout Engine
            </h1>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
              Declarative Constraint Solver & Multi-Surface Ad Adapter
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className={`tab-pill ${showOverlay ? 'active' : ''}`}
            onClick={() => setShowOverlay(!showOverlay)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Eye size={15} />
            Bounds Overlay
          </button>

          <div
            style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <button
              type="button"
              className={`tab-pill ${rendererType === 'dom' ? 'active' : ''}`}
              onClick={() => setRendererType('dom')}
            >
              DOM / CSS
            </button>
            <button
              type="button"
              className={`tab-pill ${rendererType === 'canvas' ? 'active' : ''}`}
              onClick={() => setRendererType('canvas')}
            >
              Canvas 2D
            </button>
          </div>
        </div>
      </header>

      {/* Surface Profile Picker Bar */}
      <section style={{ margin: '16px 24px 0 24px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`tab-pill ${selectedSurfaceKey === 'mobileInterstitial' ? 'active' : ''}`}
          onClick={() => setSelectedSurfaceKey('mobileInterstitial')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Smartphone size={16} />
          Mobile Portrait (320x480)
        </button>

        <button
          type="button"
          className={`tab-pill ${selectedSurfaceKey === 'mobileLandscape' ? 'active' : ''}`}
          onClick={() => setSelectedSurfaceKey('mobileLandscape')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Monitor size={16} />
          Mobile Landscape (667x375)
        </button>

        <button
          type="button"
          className={`tab-pill ${selectedSurfaceKey === 'broadcastLowerThird' ? 'active' : ''}`}
          onClick={() => setSelectedSurfaceKey('broadcastLowerThird')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Tv size={16} />
          Broadcast Lower-Third (1920x250)
        </button>

        <button
          type="button"
          className={`tab-pill ${selectedSurfaceKey === 'retailKiosk' ? 'active' : ''}`}
          onClick={() => setSelectedSurfaceKey('retailKiosk')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Square size={16} />
          Retail Kiosk (1080x1080)
        </button>

        <button
          type="button"
          className={`tab-pill ${selectedSurfaceKey === 'crampedStressTest' ? 'active' : ''}`}
          onClick={() => setSelectedSurfaceKey('crampedStressTest')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <AlertTriangle size={16} color="#f59e0b" />
          Cramped Stress-Test (300x200)
        </button>

        <button
          type="button"
          className={`tab-pill ${selectedSurfaceKey === 'custom' ? 'active' : ''}`}
          onClick={() => {
            setSelectedSurfaceKey('custom');
            setActiveTab('sandbox');
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Sliders size={16} color="#60a5fa" />
          Custom Sandbox (5th Surface)
        </button>
      </section>

      {/* Main Studio Viewport & Side Panel */}
      <main style={{ display: 'flex', gap: '20px', padding: '16px 24px 24px 24px', flex: 1 }}>
        {/* Left Studio Canvas Area */}
        <section
          className="glass-panel"
          style={{
            flex: 1,
            minHeight: '620px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            padding: '32px',
            overflow: 'hidden',
          }}
        >
          {/* Surface Metrics Header Overlay */}
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(15, 23, 42, 0.8)',
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
              {activeSurface.name}
            </span>
            <span className="badge-tag badge-success">
              {activeSurface.width} × {activeSurface.height} px
            </span>
            <span className="badge-tag badge-warning">
              {resolvedLayout.orientation.toUpperCase()} TOPOLOGY
            </span>
          </div>

          {/* Render Frame with Scaling Transform */}
          <div
            style={{
              transform: `scale(${previewScale})`,
              transformOrigin: 'center center',
              transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {rendererType === 'dom' ? (
              <DomRenderer
                layout={resolvedLayout}
                showBoundingBoxes={showOverlay}
                onElementHover={setHoveredBox}
              />
            ) : (
              <CanvasRenderer layout={resolvedLayout} showBoundingBoxes={showOverlay} />
            )}
          </div>

          {previewScale < 1 && (
            <div
              style={{
                position: 'absolute',
                bottom: '16px',
                right: '20px',
                fontSize: '11px',
                fontFamily: "'JetBrains Mono', monospace",
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Maximize2 size={13} />
              Scaled {Math.round(previewScale * 100)}% for viewport display
            </div>
          )}
        </section>

        {/* Right Telemetry & Inspector Panel */}
        <aside
          className="glass-panel"
          style={{
            width: '420px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Side Tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              padding: '12px 16px',
              gap: '8px',
            }}
          >
            <button
              type="button"
              className={`tab-pill ${activeTab === 'telemetry' ? 'active' : ''}`}
              onClick={() => setActiveTab('telemetry')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Activity size={14} />
              Telemetry
            </button>
            <button
              type="button"
              className={`tab-pill ${activeTab === 'sandbox' ? 'active' : ''}`}
              onClick={() => {
                setSelectedSurfaceKey('custom');
                setActiveTab('sandbox');
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Sliders size={14} />
              Sandbox
            </button>
            <button
              type="button"
              className={`tab-pill ${activeTab === 'spec' ? 'active' : ''}`}
              onClick={() => setActiveTab('spec')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Code2 size={14} />
              Spec JSON
            </button>
          </div>

          {/* Side Content Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {activeTab === 'telemetry' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Status Summary Banner */}
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    background:
                      resolvedLayout.telemetry.constraintStatus === 'satisfied'
                        ? 'rgba(16, 185, 129, 0.1)'
                        : 'rgba(245, 158, 11, 0.1)',
                    border:
                      resolvedLayout.telemetry.constraintStatus === 'satisfied'
                        ? '1px solid rgba(16, 185, 129, 0.3)'
                        : '1px solid rgba(245, 158, 11, 0.3)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  {resolvedLayout.telemetry.constraintStatus === 'satisfied' ? (
                    <CheckCircle2 size={20} color="#34d399" style={{ marginTop: '2px' }} />
                  ) : (
                    <AlertTriangle size={20} color="#fbbf24" style={{ marginTop: '2px' }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>
                      {resolvedLayout.telemetry.constraintStatus === 'satisfied'
                        ? 'Optimal Layout Resolved'
                        : 'Priority Degradation Applied'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                      Solved in <strong>{resolvedLayout.telemetry.resolutionTimeMs} ms</strong> with zero overlaps.
                    </div>
                  </div>
                </div>

                {/* Telemetry Metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Usable Aspect Ratio</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
                      {resolvedLayout.telemetry.aspectRatio} : 1
                    </div>
                  </div>

                  <div
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Canvas Utilization</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                      {Math.round(resolvedLayout.telemetry.utilizationRatio * 100)}%
                    </div>
                  </div>
                </div>

                {/* Degradation Log */}
                {(resolvedLayout.telemetry.degradedElements.length > 0 ||
                  resolvedLayout.telemetry.hiddenElements.length > 0) && (
                  <div>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#fcd34d', marginBottom: '10px' }}>
                      ⚡ Priority Degradation Cascade Log
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {Object.values(resolvedLayout.boxes).map((box) => {
                        if (!box.degraded && box.visible) return null;
                        return (
                          <div
                            key={box.id}
                            style={{
                              background: 'rgba(245, 158, 11, 0.08)',
                              borderLeft: '3px solid #f59e0b',
                              padding: '10px 12px',
                              borderRadius: '0 8px 8px 0',
                            }}
                          >
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24' }}>
                              {box.id.toUpperCase()} • Priority {box.priority}
                            </div>
                            <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '3px' }}>
                              {box.degradationReason || 'Element adjusted under constraint pressure'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Resolved Boxes Table */}
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginBottom: '10px' }}>
                    📐 Resolved Pixel Coordinates
                  </h3>
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.06)',
                      overflow: 'hidden',
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', textAlign: 'left' }}>
                          <th style={{ padding: '8px 10px' }}>Element</th>
                          <th style={{ padding: '8px 10px' }}>X, Y</th>
                          <th style={{ padding: '8px 10px' }}>W × H</th>
                          <th style={{ padding: '8px 10px' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.values(resolvedLayout.boxes).map((box) => (
                          <tr
                            key={box.id}
                            style={{
                              borderTop: '1px solid rgba(255,255,255,0.04)',
                              background:
                                hoveredBox?.id === box.id
                                  ? 'rgba(59, 130, 246, 0.2)'
                                  : 'transparent',
                            }}
                          >
                            <td style={{ padding: '8px 10px', fontWeight: 600, color: '#f8fafc' }}>
                              {box.id}
                            </td>
                            <td style={{ padding: '8px 10px', fontFamily: "'JetBrains Mono', monospace", color: '#94a3b8' }}>
                              {Math.round(box.x)}, {Math.round(box.y)}
                            </td>
                            <td style={{ padding: '8px 10px', fontFamily: "'JetBrains Mono', monospace", color: '#94a3b8' }}>
                              {Math.round(box.width)}×{Math.round(box.height)}
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              {!box.visible ? (
                                <span className="badge-tag badge-danger">Hidden</span>
                              ) : box.degraded ? (
                                <span className="badge-tag badge-warning">Degraded</span>
                              ) : (
                                <span className="badge-tag badge-success">OK</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Sandbox Panel */}
            {activeTab === 'sandbox' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>
                  Simulate an <strong>unknown surface</strong> live in real-time. Adjust physical dimensions, safe areas, and target constraints:
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                    Width: {customWidth}px
                  </label>
                  <input
                    type="range"
                    min="240"
                    max="1920"
                    step="10"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                    Height: {customHeight}px
                  </label>
                  <input
                    type="range"
                    min="150"
                    max="1200"
                    step="10"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                    Safe Area Padding: {customTopSafe}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    value={customTopSafe}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCustomTopSafe(val);
                      setCustomBottomSafe(val);
                      setCustomSideSafe(val);
                    }}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                    Min Touch Tap Target: {customMinTap}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={customMinTap}
                    onChange={(e) => setCustomMinTap(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                    Min Text Font Size: {customMinText}px
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="32"
                    value={customMinText}
                    onChange={(e) => setCustomMinText(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                    Viewing Distance Environment
                  </label>
                  <select
                    value={customViewing}
                    onChange={(e) => setCustomViewing(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#ffffff',
                    }}
                  >
                    <option value="near">Near (Handheld Mobile / Tablet)</option>
                    <option value="medium">Medium (Kiosk / Desktop)</option>
                    <option value="far">Far (TV Broadcast / Billboard)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Declarative Spec JSON Viewer */}
            {activeTab === 'spec' && (
              <div>
                <pre
                  style={{
                    background: 'rgba(0,0,0,0.5)',
                    padding: '14px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontFamily: "'JetBrains Mono', monospace",
                    color: '#38bdf8',
                    overflowX: 'auto',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {JSON.stringify(defaultAdSpec, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
};
