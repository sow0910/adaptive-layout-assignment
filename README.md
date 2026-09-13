
# Adaptive Layout Engine for Multi-Surface Ads

A pure, framework-agnostic TypeScript constraint resolution engine designed to dynamically adapt a single declarative ad specification across heterogeneous physical surfaces (Mobile Portrait, Mobile Landscape, Broadcast Lower-Third, Square Retail Kiosk, and Cramped Screens), without per-surface hardcoded layouts or CSS media query branches.

![Engine Demo](https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&auto=format&fit=crop&q=80)

---

## 🚀 Quick Start

### 1. Installation
```bash
npm install
```

### 2. Run Live Interactive Studio Demo
```bash
npm run dev
```
Open the URL shown in your terminal (typically http://localhost:5173 or http://localhost:5175) in your browser.

### 3. Run Automated Test Suite
```bash
npm test
```
Executes Vitest unit tests verifying 0% element overlap, 100% boundary containment, priority degradation ordering, and dynamic 5th surface handling.

### 4. Build Production Bundle
```bash
npm run build
```

---

## 📐 Resolution Flow Topology

```text
┌─────────────────────────┐       ┌────────────────────────────┐
│   Declarative AdSpec    │   +   │   Surface Constraints      │
│  (Elements & Priorities)│       │(Width, Height, Safe Areas, │
└────────────┬────────────┘       │ Min Tap Target, Text Size) │
             │                    └──────────────┬─────────────┘
             │                                   │
             └─────────────────┬─────────────────┘
                               │
                               ▼
               ┌───────────────────────────────┐
               │    TypeScript Layout Resolver │
               │   (Continuous Topo Solver +   │
               │   Degradation Cascade Engine) │
               └───────────────┬───────────────┘
                               │
                               ▼
               ┌───────────────────────────────┐
               │   Resolved Pixel Coordinates  │
               │  (x, y, w, h, fontSize, etc.) │
               └───────────────┬───────────────┘
                               │
           ┌───────────────────┴───────────────────┐
           ▼                                       ▼
┌─────────────────────┐                 ┌─────────────────────┐
│  DOM/CSS Renderer   │                 │  Canvas 2D Renderer │
│ (React Box Styler)  │                 │(HTML5 Canvas Context│
└─────────────────────┘                 └─────────────────────┘
```

---

## 🛠 Layout Resolution Algorithm (Step-by-Step)

The engine avoids pseudo-resolvers such as `if (surface === "mobile")` or CSS `@media` queries. Instead, layout decisions are derived purely from continuous mathematical constraints and geometry synthesis:

### Step 1: Available Canvas Ingestion
Computes usable interior bounding box by subtracting physical safe-area paddings (notches, bezels, TV overscan margins):
$$\text{UsableWidth} = \text{SurfaceWidth} - \text{SafeArea.left} - \text{SafeArea.right}$$
$$\text{UsableHeight} = \text{SurfaceHeight} - \text{SafeArea.top} - \text{SafeArea.bottom}$$
$$\text{Aspect Ratio } (AR) = \frac{\text{UsableWidth}}{\text{UsableHeight}}$$

### Step 2: Continuous Spatial Topology Selection
Determines spatial layout flow based on continuous aspect ratio vector $AR$:
- **Ultra-Wide ($AR \ge 2.0$)** $\implies$ **Horizontal Banner Flow** (Left: Branding/Headline, Center: Hero image, Right: CTA).
- **Tall Portrait ($AR \le 0.75$)** $\implies$ **Vertical Stack Flow** (Top: Branding, Middle: Hero + Headline, Lower: Price, Bottom: CTA).
- **Split Grid ($0.75 < AR < 2.0$)** $\implies$ **2-Column / Balanced Grid Flow** (Hero product primary pane, secondary detail pane).

### Step 3: Hard Constraint Base Values
Enforces surface-driven interaction and legibility requirements:
- **Buttons / Actions**: Enforces $\text{Height} \ge \text{minTapTarget}$ (e.g. 44px on iOS touch, 60px on Kiosk).
- **Text / Copy**: Enforces $\text{FontSize} \ge \text{minTextSize}$ (scaled 1.5x up for `viewingDistance === "far"` broadcast).

### Step 4: Priority & Progressive Degradation Cascade Solver
When usable space is insufficient for all elements at native scale, the engine executes a deterministic 6-pass degradation loop:
1. **Pass 1**: Scale down Hero Product Image (down to 70% scale factor).
2. **Pass 2**: Reduce price copy font size and toggle `truncated = true`.
3. **Pass 3**: Hide lowest-priority element (**Priority 3 Branding Logo**).
4. **Pass 4**: Hide secondary copy (**Priority 2 Price Text**).
5. **Pass 5**: Compress Hero Image scale factor further (down to 45%).
6. **Pass 6**: Protect **Priority 1 (Headline & CTA)** at mandatory surface minimum sizes.

### Step 5: Box Geometry Packing & Boundary Guard
Calculates exact pixel coordinates `(x, y, width, height)` for every active element and applies strict boundary clipping guards:
$$x \in [\text{usableX}, \text{usableX} + \text{usableW} - \text{width}]$$
$$y \in [\text{usableY}, \text{usableY} + \text{usableH} - \text{height}]$$

---

## 🎨 Dual Renderer Support

To prove total decoupling of the algorithm from React and the DOM, the project ships with two independent rendering backends consuming the exact same `ResolvedLayout`:
1. **DOM/CSS Renderer (`src/render-dom.tsx`)**: Renders boxes into absolutely positioned React DOM nodes with CSS spring transitions.
2. **HTML5 Canvas Renderer (`src/render-canvas.tsx`)**: Renders boxes directly onto an HTML5 2D Canvas context using raw drawing primitives.

Both renderers strictly render the exact same **MacBook Pro Midnight Blue** advertisement.

---

## 🏷 TypeScript Type System Design

Strong typing guarantees that invalid specs or surface combinations are caught at compile-time:

```typescript
// Strict Element Types, Roles & Priorities
export type ElementType = 'text' | 'image' | 'button';
export type ElementRole = 'primary' | 'secondary' | 'hero' | 'branding' | 'action';
export type Priority = 1 | 2 | 3;

// Type-Safe Ad Element Definition
export interface AdElement {
  id: string;
  type: ElementType;
  role: ElementRole;
  priority: Priority;
  content?: string;
  src?: string;
  alt?: string;
  aspectRatio?: number;
}

// Surface Constraints with Operational Controls
export interface SurfaceProfile {
  id: string;
  name: string;
  width: number;
  height: number;
  safeArea: { top: number; right: number; bottom: number; left: number };
  minTapTarget?: number;
  minTextSize?: number;
  viewingDistance?: 'near' | 'medium' | 'far';
  touchOnly?: boolean;
}
```

---

## 🎯 Test Surface Profiles

1. **Mobile Portrait (320×480)**: Tall portrait interstitial with notch safe areas and 44px tap targets.
2. **Mobile Landscape (667×375)**: Wide handheld screen adapting into a 2-column split.
3. **Broadcast Lower-Third (1920×250)**: Wide banner overlay with 26px minimum font size for far viewing distances.
4. **Retail Kiosk (1080×1080)**: 1:1 square touch screen demanding 60px tap targets and high-visibility CTA.
5. **Cramped Surface (280×160)**: Stress-test surface forcing logo drop and price truncation while keeping CTA and Headline intact.
6. **Custom Sandbox (5th Surface)**: Live interactive slider panel in the demo app allowing real-time testing of arbitrary surface dimensions.

---

## 🤖 AI Tools Disclosure

OpenAI ChatGPT/Codex and Google Antigravity were used for code scaffolding, implementation assistance, debugging, documentation, and test-case suggestions.

The final implementation was reviewed and tested by the author, who is responsible for understanding and explaining the submitted code.

---

## ⏳ Time Spent
- **Time Spent**: 3 days (~15 hours total across design, engine implementation, renderer decoupling, UI studio polish, testing & documentation).

---

## 💡 Live Interview Cheat Sheet

### 1. Demonstrating an Unknown 5th Surface Profile
In the live demo, switch to the **"Custom Sandbox (5th Surface)"** tab. Adjust the width, height, safe area, or tap target sliders. The engine recalculates the spatial layout in real time without any code modifications.

### 2. Explaining Degradation Sequence
When space becomes constrained, lower-priority items (Priority 3 Branding Logo) are dropped first to reserve canvas area for Priority 1 core actions (Headline & CTA). Every degradation step is logged in `resolvedLayout.telemetry.degradedElements` and visible in the studio side panel.

### 3. Extending to Print Bleed or Broadcast Safe-Zones
Print bleed or TV safe title areas are represented cleanly as extended `safeArea` margins in the `SurfaceProfile` input dictionary without modifying `resolver.ts`.
```