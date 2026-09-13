import { describe, it, expect } from 'vitest';
import { defaultAdSpec, defineAd } from './spec';
import { standardSurfaces, SurfaceProfile } from './surfaces';
import { resolveLayout, ResolvedBox } from './resolver';

/**
 * Helper function to detect bounding box overlap between two boxes.
 */
function boxesOverlap(a: ResolvedBox, b: ResolvedBox): boolean {
  if (!a.visible || !b.visible) return false;
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

describe('Adaptive Layout Engine - Constraint Resolver', () => {

  it('should generate valid layouts for all 5 standard surfaces without errors', () => {
    Object.values(standardSurfaces).forEach((surface) => {
      const layout = resolveLayout(defaultAdSpec, surface);
      expect(layout).toBeDefined();
      expect(layout.surfaceId).toBe(surface.id);
      expect(Object.keys(layout.boxes).length).toBe(defaultAdSpec.elements.length);
    });
  });

  it('GUARANTEE: Zero element overlap across ALL standard surface profiles', () => {
    Object.values(standardSurfaces).forEach((surface) => {
      const layout = resolveLayout(defaultAdSpec, surface);
      const visibleBoxes = Object.values(layout.boxes).filter((b) => b.visible);

      for (let i = 0; i < visibleBoxes.length; i++) {
        for (let j = i + 1; j < visibleBoxes.length; j++) {
          const boxA = visibleBoxes[i];
          const boxB = visibleBoxes[j];
          const hasOverlap = boxesOverlap(boxA, boxB);
          expect(
            hasOverlap,
            `Overlap detected on surface "${surface.name}" between "${boxA.id}" and "${boxB.id}"`
          ).toBe(false);
        }
      }
    });
  });

  it('GUARANTEE: 100% strict surface bounds containment', () => {
    Object.values(standardSurfaces).forEach((surface) => {
      const layout = resolveLayout(defaultAdSpec, surface);
      const bounds = layout.usableBounds;

      Object.values(layout.boxes).forEach((box) => {
        if (!box.visible) return;

        expect(box.x, `Box ${box.id} left boundary on ${surface.id}`).toBeGreaterThanOrEqual(bounds.x);
        expect(box.y, `Box ${box.id} top boundary on ${surface.id}`).toBeGreaterThanOrEqual(bounds.y);
        expect(box.x + box.width, `Box ${box.id} right boundary on ${surface.id}`).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
        expect(box.y + box.height, `Box ${box.id} bottom boundary on ${surface.id}`).toBeLessThanOrEqual(bounds.y + bounds.height + 1);
      });
    });
  });

  it('DEGRADATION RULE: Drops lower-priority branding before compromising CTA/Headline', () => {
    const crampedSurface = standardSurfaces.crampedStressTest; // 300x200
    const layout = resolveLayout(defaultAdSpec, crampedSurface);

    const headlineBox = layout.boxes['headline'];
    const ctaBox = layout.boxes['cta'];
    const logoBox = layout.boxes['logo'];

    // Headline and CTA (Priority 1) MUST remain visible and usable
    expect(headlineBox.visible).toBe(true);
    expect(ctaBox.visible).toBe(true);

    // Logo (Priority 3) MUST drop cleanly (visible = false) to prevent overflow
    expect(logoBox.visible).toBe(false);
    expect(logoBox.degradationReason).toBeDefined();
    expect(layout.telemetry.hiddenElements).toContain('logo');
  });

  it('TOUCH CONSTRAINT: Enforces minTapTarget for interactive buttons', () => {
    const kioskSurface = standardSurfaces.retailKiosk; // minTapTarget: 60px
    const layout = resolveLayout(defaultAdSpec, kioskSurface);
    const ctaBox = layout.boxes['cta'];

    expect(ctaBox.height).toBeGreaterThanOrEqual(kioskSurface.minTapTarget || 60);
  });

  it('LEGIBILITY CONSTRAINT: Enforces minTextSize for broadcast lower-third', () => {
    const broadcastSurface = standardSurfaces.broadcastLowerThird; // minTextSize: 26px
    const layout = resolveLayout(defaultAdSpec, broadcastSurface);
    const headlineBox = layout.boxes['headline'];

    expect(headlineBox.fontSize).toBeGreaterThanOrEqual(broadcastSurface.minTextSize || 26);
  });

  it('BONUS: Resolves a dynamic 5th unknown surface profile provided live', () => {
    const dynamicSurface: SurfaceProfile = {
      id: 'liveInterviewSurface',
      name: 'Smart Display Watch / Car Dashboard',
      description: 'Arbitrary 400x160 wide compact screen',
      width: 400,
      height: 160,
      safeArea: { top: 8, right: 16, bottom: 8, left: 16 },
      minTapTarget: 40,
      minTextSize: 14,
      viewingDistance: 'near',
      touchOnly: true,
    };

    const layout = resolveLayout(defaultAdSpec, dynamicSurface);
    expect(layout).toBeDefined();
    expect(layout.telemetry.constraintStatus).toBeDefined();

    // Verify zero overlaps on dynamic surface
    const visibleBoxes = Object.values(layout.boxes).filter((b) => b.visible);
    for (let i = 0; i < visibleBoxes.length; i++) {
      for (let j = i + 1; j < visibleBoxes.length; j++) {
        expect(boxesOverlap(visibleBoxes[i], visibleBoxes[j])).toBe(false);
      }
    }
  });

});
