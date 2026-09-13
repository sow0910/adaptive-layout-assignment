/**
 * Adaptive Layout Engine - Constraint Resolution Algorithm
 * 
 * Takes an abstract AdSpec and SurfaceProfile constraints and computes exact pixel bounding boxes
 * for every element using a dynamic topological layout model, continuous geometric solvers,
 * surface-driven minimum constraints, and a deterministic priority degradation cascade.
 */

import { AdSpec, AdElement, ElementRole, ElementType, AdPriority } from './spec';
import { SurfaceProfile } from './surfaces';

export interface ResolvedBox {
  id: string;
  role: ElementRole;
  type: ElementType;
  priority: AdPriority;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  fontSize?: number;
  truncated?: boolean;
  degraded?: boolean;
  degradationReason?: string;
  zIndex: number;
  content?: string;
  src?: string;
}

export interface ResolvedLayout {
  specId?: string;
  surfaceId: string;
  surfaceWidth: number;
  surfaceHeight: number;
  usableBounds: { x: number; y: number; width: number; height: number };
  boxes: Record<string, ResolvedBox>;
  orientation: 'vertical' | 'horizontal' | 'split';
  telemetry: {
    degradedElements: string[];
    hiddenElements: string[];
    aspectRatio: number;
    utilizationRatio: number;
    resolutionTimeMs: number;
    constraintStatus: 'satisfied' | 'degraded' | 'overflow_risk';
  };
}

/**
 * Main resolution entrypoint.
 * Pure function: receives ad spec + surface profile, returns fully resolved boxes & layout metrics.
 */
export function resolveLayout(spec: AdSpec, surface: SurfaceProfile): ResolvedLayout {
  const startTime = performance.now();

  // -------------------------------------------------------------
  // Stage 1: Usable Bounds Calculation
  // -------------------------------------------------------------
  const safeArea = surface.safeArea || { top: 0, right: 0, bottom: 0, left: 0 };
  const usableX = safeArea.left;
  const usableY = safeArea.top;
  const usableW = Math.max(10, surface.width - safeArea.left - safeArea.right);
  const usableH = Math.max(10, surface.height - safeArea.top - safeArea.bottom);
  const surfaceAR = usableW / usableH;

  // -------------------------------------------------------------
  // Stage 2: Topology Selection (Continuous Aspect Ratio)
  // -------------------------------------------------------------
  let orientation: 'vertical' | 'horizontal' | 'split';
  if (surfaceAR >= 2.0) {
    orientation = 'horizontal'; // Ultra-wide (e.g. Broadcast Lower-Third 1920x250)
  } else if (surfaceAR <= 0.75) {
    orientation = 'vertical'; // Tall portrait (e.g. Mobile Interstitial 320x480)
  } else {
    orientation = 'split'; // Near-square / landscape (e.g. Kiosk 1080x1080, Mobile Landscape 667x375)
  }

  // -------------------------------------------------------------
  // Stage 3: Surface-Driven Hard Constraint Base Values
  // -------------------------------------------------------------
  const minTapTarget = surface.minTapTarget || 44; // Surface touch min (px)
  const minTextSize = surface.minTextSize || 12;   // Surface text legibility min (px)
  const isFarViewing = surface.viewingDistance === 'far';
  const textScaleMultiplier = isFarViewing ? 1.5 : 1.0;

  // Base font size calculations
  const baseHeadlineSize = Math.max(minTextSize, Math.round(Math.min(usableW, usableH) * 0.08 * textScaleMultiplier));
  const basePriceSize = Math.max(minTextSize * 0.9, Math.round(baseHeadlineSize * 0.65));
  const baseCtaTextSize = Math.max(minTextSize * 0.95, Math.round(baseHeadlineSize * 0.6));

  // State flags for degradation cascade
  let logoVisible = true;
  let priceVisible = true;
  let priceTruncated = false;
  let heroScaleFactor = 1.0;
  const degradedElements: string[] = [];
  const hiddenElements: string[] = [];

  // Map elements by role for quick lookups
  const elementMap = new Map<ElementRole, AdElement>();
  spec.elements.forEach((el) => elementMap.set(el.role, el));

  const headlineEl = elementMap.get('primary');
  const heroEl = elementMap.get('hero');
  const ctaEl = elementMap.get('action');
  const priceEl = elementMap.get('secondary');
  const logoEl = elementMap.get('branding');

  // -------------------------------------------------------------
  // Stage 4: Progressive Degradation Cascade Solver
  // -------------------------------------------------------------
  // We execute iterative passes if total content height/width exceeds usable space.
  let solutionFound = false;
  let currentHeadlineSize = baseHeadlineSize;
  let currentPriceSize = basePriceSize;
  let currentCtaTextSize = baseCtaTextSize;

  for (let pass = 0; pass < 6; pass++) {
    // Check if current scale settings fit within usable bounds
    const estimatedHeight = estimateContentDimensions({
      orientation,
      usableW,
      usableH,
      headlineSize: currentHeadlineSize,
      priceSize: currentPriceSize,
      ctaTextSize: currentCtaTextSize,
      minTapTarget,
      heroScaleFactor,
      logoVisible,
      priceVisible,
      heroAspectRatio: heroEl?.aspectRatio || 1.25,
      logoAspectRatio: logoEl?.aspectRatio || 2.5,
    });

    if (estimatedHeight.totalH <= usableH && estimatedHeight.totalW <= usableW) {
      solutionFound = true;
      break;
    }

    // Degradation steps:
    if (pass === 0) {
      // Pass 1: Reduce Hero Image scale factor (1.0 -> 0.7)
      heroScaleFactor = 0.7;
      if (heroEl) degradedElements.push(heroEl.id);
    } else if (pass === 1) {
      // Pass 2: Truncate secondary text and shrink price font
      priceTruncated = true;
      currentPriceSize = Math.max(minTextSize, Math.round(currentPriceSize * 0.8));
      if (priceEl) degradedElements.push(priceEl.id);
    } else if (pass === 2) {
      // Pass 3: Drop lowest priority element (Branding logo - Priority 3)
      if (logoEl && logoVisible) {
        logoVisible = false;
        hiddenElements.push(logoEl.id);
      }
    } else if (pass === 3) {
      // Pass 4: Drop secondary element (Price - Priority 2)
      if (priceEl && priceVisible) {
        priceVisible = false;
        hiddenElements.push(priceEl.id);
      }
    } else if (pass === 4) {
      // Pass 5: Compress Hero Image further (0.7 -> 0.45)
      heroScaleFactor = 0.45;
    } else if (pass === 5) {
      // Pass 6: Scale down headline to min text size to preserve CTA (Priority 1 protected)
      currentHeadlineSize = Math.max(minTextSize, Math.round(currentHeadlineSize * 0.8));
    }
  }

  // -------------------------------------------------------------
  // Stage 5: Precise Box Layout Synthesis & Placement
  // -------------------------------------------------------------
  const boxes: Record<string, ResolvedBox> = {};

  if (orientation === 'horizontal') {
    // =========================================================
    // HORIZONTAL FLOW (e.g. Broadcast Lower-Third)
    // Left: Branding Logo & Headline
    // Center: Hero Product Image & Price
    // Right: Action CTA Button
    // =========================================================
    const padding = 12;
    const rightColW = Math.max(140, Math.min(260, usableW * 0.22));
    const ctaW = Math.max(minTapTarget * 2, rightColW - 16);
    const ctaH = Math.max(minTapTarget, usableH * 0.45);
    const ctaX = usableX + usableW - ctaW;
    const ctaY = usableY + (usableH - ctaH) / 2;

    if (ctaEl) {
      boxes[ctaEl.id] = {
        id: ctaEl.id,
        role: ctaEl.role,
        type: ctaEl.type,
        priority: ctaEl.priority,
        x: ctaX,
        y: ctaY,
        width: ctaW,
        height: ctaH,
        visible: true,
        fontSize: currentCtaTextSize,
        zIndex: 3,
        content: ctaEl.content,
      };
    }

    const availableLeftW = ctaX - usableX - padding * 2;
    let currentX = usableX;

    // Logo (if visible)
    if (logoEl && logoVisible) {
      const logoH = Math.min(usableH * 0.4, 40);
      const logoW = logoH * (logoEl.aspectRatio || 2.5);
      boxes[logoEl.id] = {
        id: logoEl.id,
        role: logoEl.role,
        type: logoEl.type,
        priority: logoEl.priority,
        x: currentX,
        y: usableY + (usableH - logoH) / 2,
        width: logoW,
        height: logoH,
        visible: true,
        zIndex: 2,
        src: logoEl.src,
      };
      currentX += logoW + padding;
    }

    // Hero Image
    if (heroEl) {
      const heroH = usableH * 0.85 * heroScaleFactor;
      const heroW = Math.min(heroH * (heroEl.aspectRatio || 1.25), availableLeftW * 0.35);
      boxes[heroEl.id] = {
        id: heroEl.id,
        role: heroEl.role,
        type: heroEl.type,
        priority: heroEl.priority,
        x: currentX,
        y: usableY + (usableH - heroH) / 2,
        width: heroW,
        height: heroH,
        visible: true,
        zIndex: 2,
        src: heroEl.src,
      };
      currentX += heroW + padding;
    }

    // Headline & Price text stack
    const remainingW = Math.max(50, ctaX - currentX - padding);
    let textY = usableY + usableH * 0.2;

    if (headlineEl) {
      const headH = Math.min(usableH * 0.45, currentHeadlineSize * 1.3);
      boxes[headlineEl.id] = {
        id: headlineEl.id,
        role: headlineEl.role,
        type: headlineEl.type,
        priority: headlineEl.priority,
        x: currentX,
        y: textY,
        width: remainingW,
        height: headH,
        visible: true,
        fontSize: currentHeadlineSize,
        zIndex: 2,
        content: headlineEl.content,
      };
      textY += headH + 4;
    }

    if (priceEl && priceVisible) {
      const priceH = Math.min(usableH * 0.3, currentPriceSize * 1.2);
      boxes[priceEl.id] = {
        id: priceEl.id,
        role: priceEl.role,
        type: priceEl.type,
        priority: priceEl.priority,
        x: currentX,
        y: textY,
        width: remainingW,
        height: priceH,
        visible: true,
        fontSize: currentPriceSize,
        truncated: priceTruncated,
        degraded: priceTruncated,
        degradationReason: priceTruncated ? 'Text font reduced & truncated to fit lower-third height' : undefined,
        zIndex: 2,
        content: priceEl.content,
      };
    }
  } else if (orientation === 'vertical') {
    // =========================================================
    // VERTICAL STACK FLOW (e.g. Mobile Interstitial 320x480)
    // Top: Logo
    // Center: Headline -> Hero Product Image -> Price
    // Bottom: Action CTA Button
    // =========================================================
    const gap = 12;
    let currentY = usableY;

    // Logo
    if (logoEl) {
      if (logoVisible) {
        const logoH = Math.min(usableH * 0.08, 36);
        const logoW = Math.min(usableW * 0.5, logoH * (logoEl.aspectRatio || 2.5));
        boxes[logoEl.id] = {
          id: logoEl.id,
          role: logoEl.role,
          type: logoEl.type,
          priority: logoEl.priority,
          x: usableX + (usableW - logoW) / 2,
          y: currentY,
          width: logoW,
          height: logoH,
          visible: true,
          zIndex: 2,
          src: logoEl.src,
        };
        currentY += logoH + gap;
      } else {
        boxes[logoEl.id] = createHiddenBox(logoEl, 'Dropped branding logo to protect primary content in cramped height');
      }
    }

    // Headline
    if (headlineEl) {
      const headH = Math.round(currentHeadlineSize * 1.3);
      boxes[headlineEl.id] = {
        id: headlineEl.id,
        role: headlineEl.role,
        type: headlineEl.type,
        priority: headlineEl.priority,
        x: usableX,
        y: currentY,
        width: usableW,
        height: headH,
        visible: true,
        fontSize: currentHeadlineSize,
        zIndex: 2,
        content: headlineEl.content,
      };
      currentY += headH + gap;
    }

    // CTA reserved at bottom
    const ctaH = Math.max(minTapTarget, Math.round(usableH * 0.11));
    const ctaW = usableW;
    const ctaY = usableY + usableH - ctaH;

    if (ctaEl) {
      boxes[ctaEl.id] = {
        id: ctaEl.id,
        role: ctaEl.role,
        type: ctaEl.type,
        priority: ctaEl.priority,
        x: usableX,
        y: ctaY,
        width: ctaW,
        height: ctaH,
        visible: true,
        fontSize: currentCtaTextSize,
        zIndex: 3,
        content: ctaEl.content,
      };
    }

    // Price reserved above CTA
    let priceH = 0;
    if (priceEl) {
      if (priceVisible) {
        priceH = Math.round(currentPriceSize * 1.3);
        const priceY = ctaY - priceH - gap;
        boxes[priceEl.id] = {
          id: priceEl.id,
          role: priceEl.role,
          type: priceEl.type,
          priority: priceEl.priority,
          x: usableX,
          y: priceY,
          width: usableW,
          height: priceH,
          visible: true,
          fontSize: currentPriceSize,
          truncated: priceTruncated,
          degraded: priceTruncated,
          degradationReason: priceTruncated ? 'Font reduced & truncated due to height constraints' : undefined,
          zIndex: 2,
          content: priceEl.content,
        };
      } else {
        boxes[priceEl.id] = createHiddenBox(priceEl, 'Dropped secondary price text due to extreme space restrictions');
      }
    }

    // Hero Image fills remaining middle vertical space
    const maxHeroSpace = (ctaY - (priceH > 0 ? priceH + gap : 0) - gap) - currentY;
    if (heroEl) {
      if (maxHeroSpace >= 40) {
        const rawHeroH = maxHeroSpace * heroScaleFactor;
        const heroW = Math.min(usableW, rawHeroH * (heroEl.aspectRatio || 1.25));
        const heroH = Math.min(maxHeroSpace, heroW / (heroEl.aspectRatio || 1.25));
        boxes[heroEl.id] = {
          id: heroEl.id,
          role: heroEl.role,
          type: heroEl.type,
          priority: heroEl.priority,
          x: usableX + (usableW - heroW) / 2,
          y: currentY + (maxHeroSpace - heroH) / 2,
          width: heroW,
          height: heroH,
          visible: true,
          degraded: heroScaleFactor < 1.0,
          degradationReason: heroScaleFactor < 1.0 ? `Scaled hero image down (${Math.round(heroScaleFactor * 100)}%)` : undefined,
          zIndex: 2,
          src: heroEl.src,
        };
      } else {
        boxes[heroEl.id] = createHiddenBox(heroEl, 'Hero image scaled out due to lack of vertical space');
      }
    }
  } else {
    // =========================================================
    // SPLIT GRID FLOW (e.g. Retail Kiosk 1080x1080, Mobile Landscape 667x375)
    // 2-column or balanced multi-pane layout
    // =========================================================
    const gap = 16;
    const isWideSplit = usableW > usableH * 1.1;

    if (isWideSplit) {
      // 2-Column Split: Left = Hero Image; Right = Branding, Headline, Price, CTA
      const leftColW = Math.round(usableW * 0.45);
      const rightColW = usableW - leftColW - gap;

      if (heroEl) {
        const heroW = leftColW;
        const heroH = Math.min(usableH, heroW / (heroEl.aspectRatio || 1.25));
        boxes[heroEl.id] = {
          id: heroEl.id,
          role: heroEl.role,
          type: heroEl.type,
          priority: heroEl.priority,
          x: usableX,
          y: usableY + (usableH - heroH) / 2,
          width: heroW,
          height: heroH,
          visible: true,
          zIndex: 2,
          src: heroEl.src,
        };
      }

      const rightX = usableX + leftColW + gap;
      let rightY = usableY + usableH * 0.05;

      // Right Column: Logo
      if (logoEl) {
        if (logoVisible) {
          const logoH = Math.min(usableH * 0.12, 44);
          const logoW = Math.min(rightColW * 0.6, logoH * (logoEl.aspectRatio || 2.5));
          boxes[logoEl.id] = {
            id: logoEl.id,
            role: logoEl.role,
            type: logoEl.type,
            priority: logoEl.priority,
            x: rightX,
            y: rightY,
            width: logoW,
            height: logoH,
            visible: true,
            zIndex: 2,
            src: logoEl.src,
          };
          rightY += logoH + gap;
        } else {
          boxes[logoEl.id] = createHiddenBox(logoEl, 'Dropped branding logo in cramped landscape view');
        }
      }

      // Right Column: Headline
      if (headlineEl) {
        const headH = Math.round(currentHeadlineSize * 1.3 * 2); // 2 lines
        boxes[headlineEl.id] = {
          id: headlineEl.id,
          role: headlineEl.role,
          type: headlineEl.type,
          priority: headlineEl.priority,
          x: rightX,
          y: rightY,
          width: rightColW,
          height: headH,
          visible: true,
          fontSize: currentHeadlineSize,
          zIndex: 2,
          content: headlineEl.content,
        };
        rightY += headH + gap;
      }

      // Right Column: Price
      if (priceEl) {
        if (priceVisible) {
          const priceH = Math.round(currentPriceSize * 1.3);
          boxes[priceEl.id] = {
            id: priceEl.id,
            role: priceEl.role,
            type: priceEl.type,
            priority: priceEl.priority,
            x: rightX,
            y: rightY,
            width: rightColW,
            height: priceH,
            visible: true,
            fontSize: currentPriceSize,
            truncated: priceTruncated,
            degraded: priceTruncated,
            degradationReason: priceTruncated ? 'Price copy truncated for compact column width' : undefined,
            zIndex: 2,
            content: priceEl.content,
          };
          rightY += priceH + gap;
        } else {
          boxes[priceEl.id] = createHiddenBox(priceEl, 'Dropped price copy under space constraints');
        }
      }

      // Right Column: CTA
      if (ctaEl) {
        const ctaH = Math.max(minTapTarget, Math.round(usableH * 0.16));
        const ctaW = Math.min(rightColW, 240);
        boxes[ctaEl.id] = {
          id: ctaEl.id,
          role: ctaEl.role,
          type: ctaEl.type,
          priority: ctaEl.priority,
          x: rightX,
          y: Math.min(usableY + usableH - ctaH, Math.max(rightY, usableY + usableH - ctaH)),
          width: ctaW,
          height: ctaH,
          visible: true,
          fontSize: currentCtaTextSize,
          zIndex: 3,
          content: ctaEl.content,
        };
      }
    } else {
      // Near Square (e.g. 1080x1080 Retail Kiosk)
      // Hero image prominent top section (~45%), bottom section for Headline, Price, CTA, Logo
      const heroH = usableH * 0.45 * heroScaleFactor;
      const heroW = Math.min(usableW, heroH * (heroEl?.aspectRatio || 1.25));

      if (heroEl) {
        boxes[heroEl.id] = {
          id: heroEl.id,
          role: heroEl.role,
          type: heroEl.type,
          priority: heroEl.priority,
          x: usableX + (usableW - heroW) / 2,
          y: usableY,
          width: heroW,
          height: heroH,
          visible: true,
          zIndex: 2,
          src: heroEl.src,
        };
      }

      let currentY = usableY + heroH + gap;

      if (logoEl) {
        if (logoVisible) {
          const logoH = Math.min(usableH * 0.07, 50);
          const logoW = Math.min(usableW * 0.4, logoH * (logoEl.aspectRatio || 2.5));
          boxes[logoEl.id] = {
            id: logoEl.id,
            role: logoEl.role,
            type: logoEl.type,
            priority: logoEl.priority,
            x: usableX + (usableW - logoW) / 2,
            y: currentY,
            width: logoW,
            height: logoH,
            visible: true,
            zIndex: 2,
            src: logoEl.src,
          };
          currentY += logoH + gap;
        } else {
          boxes[logoEl.id] = createHiddenBox(logoEl, 'Dropped logo to protect headline and CTA');
        }
      }

      if (headlineEl) {
        const headH = Math.round(currentHeadlineSize * 1.35);
        boxes[headlineEl.id] = {
          id: headlineEl.id,
          role: headlineEl.role,
          type: headlineEl.type,
          priority: headlineEl.priority,
          x: usableX,
          y: currentY,
          width: usableW,
          height: headH,
          visible: true,
          fontSize: currentHeadlineSize,
          zIndex: 2,
          content: headlineEl.content,
        };
        currentY += headH + gap;
      }

      if (priceEl) {
        if (priceVisible) {
          const priceH = Math.round(currentPriceSize * 1.3);
          boxes[priceEl.id] = {
            id: priceEl.id,
            role: priceEl.role,
            type: priceEl.type,
            priority: priceEl.priority,
            x: usableX,
            y: currentY,
            width: usableW,
            height: priceH,
            visible: true,
            fontSize: currentPriceSize,
            truncated: priceTruncated,
            degraded: priceTruncated,
            degradationReason: priceTruncated ? 'Price truncated for kiosk grid' : undefined,
            zIndex: 2,
            content: priceEl.content,
          };
          currentY += priceH + gap;
        } else {
          boxes[priceEl.id] = createHiddenBox(priceEl, 'Dropped price copy in kiosk layout degradation');
        }
      }

      if (ctaEl) {
        const ctaH = Math.max(minTapTarget, Math.round(usableH * 0.12));
        const ctaW = Math.min(usableW * 0.85, 380);
        boxes[ctaEl.id] = {
          id: ctaEl.id,
          role: ctaEl.role,
          type: ctaEl.type,
          priority: ctaEl.priority,
          x: usableX + (usableW - ctaW) / 2,
          y: Math.min(usableY + usableH - ctaH, Math.max(currentY, usableY + usableH - ctaH)),
          width: ctaW,
          height: ctaH,
          visible: true,
          fontSize: currentCtaTextSize,
          zIndex: 3,
          content: ctaEl.content,
        };
      }
    }
  }

  // -------------------------------------------------------------
  // Stage 6: Boundary Guard & Overlap Prevention Check
  // -------------------------------------------------------------
  enforceSurfaceBounds(boxes, usableX, usableY, usableW, usableH);

  // Compute telemetry metrics
  const endTime = performance.now();
  let totalVisibleArea = 0;
  Object.values(boxes).forEach((b) => {
    if (b.visible) totalVisibleArea += b.width * b.height;
  });
  const utilizationRatio = Math.min(1.0, totalVisibleArea / (usableW * usableH));

  const constraintStatus = hiddenElements.length > 0 
    ? 'degraded' 
    : (degradedElements.length > 0 ? 'degraded' : 'satisfied');

  return {
    specId: spec.id,
    surfaceId: surface.id,
    surfaceWidth: surface.width,
    surfaceHeight: surface.height,
    usableBounds: { x: usableX, y: usableY, width: usableW, height: usableH },
    boxes,
    orientation,
    telemetry: {
      degradedElements,
      hiddenElements,
      aspectRatio: Number(surfaceAR.toFixed(2)),
      utilizationRatio: Number(utilizationRatio.toFixed(2)),
      resolutionTimeMs: Number((endTime - startTime).toFixed(2)),
      constraintStatus,
    },
  };
}

/**
 * Creates a zero-dimensional hidden box for an element that was dropped during degradation.
 */
function createHiddenBox(element: AdElement, reason: string): ResolvedBox {
  return {
    id: element.id,
    role: element.role,
    type: element.type,
    priority: element.priority,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    visible: false,
    degraded: true,
    degradationReason: reason,
    zIndex: 0,
    content: element.content,
    src: element.src,
  };
}

/**
 * Helper to estimate combined content height and width for degradation detection.
 */
function estimateContentDimensions(params: {
  orientation: 'vertical' | 'horizontal' | 'split';
  usableW: number;
  usableH: number;
  headlineSize: number;
  priceSize: number;
  ctaTextSize: number;
  minTapTarget: number;
  heroScaleFactor: number;
  logoVisible: boolean;
  priceVisible: boolean;
  heroAspectRatio: number;
  logoAspectRatio: number;
}): { totalW: number; totalH: number } {
  const {
    orientation,
    usableW,
    usableH,
    headlineSize,
    priceSize,
    minTapTarget,
    heroScaleFactor,
    logoVisible,
    priceVisible,
    heroAspectRatio,
  } = params;

  if (orientation === 'vertical') {
    const logoH = logoVisible ? Math.min(usableH * 0.08, 36) : 0;
    const headlineH = headlineSize * 1.3;
    const heroH = usableH * 0.4 * heroScaleFactor;
    const priceH = priceVisible ? priceSize * 1.3 : 0;
    const ctaH = Math.max(minTapTarget, usableH * 0.11);
    const gaps = 5 * 12;

    return {
      totalW: usableW,
      totalH: logoH + headlineH + heroH + priceH + ctaH + gaps,
    };
  }

  if (orientation === 'split') {
    const isWideSplit = usableW > usableH * 1.1;
    const gap = 16;

    if (isWideSplit) {
      const leftColW = Math.round(usableW * 0.45);
      const heroH = Math.min(usableH, leftColW / heroAspectRatio);

      const logoH = logoVisible ? Math.min(usableH * 0.12, 44) : 0;
      const headlineH = headlineSize * 2.2;
      const priceH = priceVisible ? priceSize * 1.3 : 0;
      const ctaH = Math.max(minTapTarget, usableH * 0.16);
      const rightColTotalH = logoH + headlineH + priceH + ctaH + 4 * gap;

      return {
        totalW: usableW,
        totalH: Math.max(heroH, rightColTotalH),
      };
    } else {
      const heroH = usableH * 0.45 * heroScaleFactor;
      const logoH = logoVisible ? Math.min(usableH * 0.07, 50) : 0;
      const headlineH = headlineSize * 1.35;
      const priceH = priceVisible ? priceSize * 1.3 : 0;
      const ctaH = Math.max(minTapTarget, usableH * 0.12);
      const totalStackH = heroH + logoH + headlineH + priceH + ctaH + 5 * gap;

      return {
        totalW: usableW,
        totalH: totalStackH,
      };
    }
  }

  // Horizontal flow (lower third)
  const rightColW = Math.max(140, Math.min(260, usableW * 0.22));
  const ctaW = Math.max(minTapTarget * 2, rightColW - 16);
  const logoW = logoVisible ? Math.min(usableH * 0.4, 40) * 2.5 : 0;
  const heroW = usableH * 0.85 * heroScaleFactor * heroAspectRatio;
  const textW = Math.max(80, headlineSize * 8);

  return {
    totalW: logoW + heroW + textW + ctaW + 4 * 12,
    totalH: usableH,
  };
}

/**
 * Hard enforcement pass: clips box coordinates to strictly fit inside the safe-area bounds.
 */
function enforceSurfaceBounds(
  boxes: Record<string, ResolvedBox>,
  minX: number,
  minY: number,
  maxW: number,
  maxH: number
): void {
  const maxX = minX + maxW;
  const maxY = minY + maxH;

  Object.values(boxes).forEach((box) => {
    if (!box.visible) return;

    // Enforce left / top bounds
    if (box.x < minX) {
      box.width = Math.max(10, box.width - (minX - box.x));
      box.x = minX;
    }
    if (box.y < minY) {
      box.height = Math.max(10, box.height - (minY - box.y));
      box.y = minY;
    }

    // Enforce right / bottom bounds
    if (box.x + box.width > maxX) {
      box.width = Math.max(10, maxX - box.x);
    }
    if (box.y + box.height > maxY) {
      box.height = Math.max(10, maxY - box.y);
    }
  });
}
