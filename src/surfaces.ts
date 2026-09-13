/**
 * Adaptive Layout Engine - Surface Profile Types & Configurations
 * 
 * Defines physical screen dimensions and real operational constraints (safe areas, tap target sizes, viewing distance).
 */

export interface SafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type ViewingDistance = 'near' | 'medium' | 'far';

export interface SurfaceProfile {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  safeArea: SafeArea;
  /** Minimum pixel dimension for interactive elements (e.g. 44px for iOS touch, 60px for Kiosk) */
  minTapTarget?: number;
  /** Minimum font size in px (e.g. 28px for broadcast lower-third viewed from across the room) */
  minTextSize?: number;
  /** Viewing environment indicator */
  viewingDistance?: ViewingDistance;
  /** Whether the surface is touch-interactive */
  touchOnly?: boolean;
}

export const standardSurfaces: Record<string, SurfaceProfile> = {
  mobileInterstitial: {
    id: 'mobileInterstitial',
    name: 'Mobile Interstitial (Portrait)',
    description: 'Tall vertical screen with notch safe area and standard 44px touch targets.',
    width: 320,
    height: 480,
    safeArea: { top: 32, right: 16, bottom: 24, left: 16 },
    minTapTarget: 44,
    minTextSize: 14,
    viewingDistance: 'near',
    touchOnly: true,
  },

  mobileLandscape: {
    id: 'mobileLandscape',
    name: 'Mobile Landscape',
    description: 'Wide handheld screen requiring horizontal content distribution.',
    width: 667,
    height: 375,
    safeArea: { top: 16, right: 32, bottom: 16, left: 32 },
    minTapTarget: 44,
    minTextSize: 13,
    viewingDistance: 'near',
    touchOnly: true,
  },

  broadcastLowerThird: {
    id: 'broadcastLowerThird',
    name: 'Broadcast Lower-Third',
    description: 'Ultra-wide TV overlay with large viewing distance and high text legibility constraints.',
    width: 1920,
    height: 250,
    safeArea: { top: 20, right: 80, bottom: 24, left: 80 },
    minTapTarget: 0,
    minTextSize: 26,
    viewingDistance: 'far',
    touchOnly: false,
  },

  retailKiosk: {
    id: 'retailKiosk',
    name: 'Square Retail Kiosk',
    description: '1:1 ratio touch screen demanding prominent high-contrast CTA and 60px touch targets.',
    width: 1080,
    height: 1080,
    safeArea: { top: 48, right: 48, bottom: 48, left: 48 },
    minTapTarget: 60,
    minTextSize: 22,
    viewingDistance: 'medium',
    touchOnly: true,
  },

  crampedStressTest: {
    id: 'crampedStressTest',
    name: 'Cramped Surface (Stress Test)',
    description: 'Extremely restricted space forcing priority degradation: drops branding & truncates copy.',
    width: 280,
    height: 160,
    safeArea: { top: 10, right: 10, bottom: 10, left: 10 },
    minTapTarget: 36,
    minTextSize: 12,
    viewingDistance: 'near',
    touchOnly: true,
  },
};
