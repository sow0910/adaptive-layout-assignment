# ARCHITECTURE.md - System Design & Layout Engine Topology

This document details the architectural principles, system topology, geometric solver mechanics, and extension points of the **Adaptive Layout Engine for Multi-Surface Ads**.

---

## 1. Architectural Principles & Separation of Concerns

The codebase strictly enforces a single-directional data pipeline with total decoupling between content intent, environmental constraints, resolution algorithms, and view rendering:

```text
┌────────────────┐     ┌──────────────────┐
│    AdSpec      │     │  SurfaceProfile  │
│ (Content Spec) │     │ (Physical Bounds)│
└───────┬────────┘     └────────┬─────────┘
        │                       │
        └───────────┬───────────┘
                    ▼
       ┌────────────────────────┐
       │   resolveLayout()      │
       │ (Pure TypeScript Engine)│
       └────────────┬───────────┘
                    ▼
       ┌────────────────────────┐
       │     ResolvedLayout     │
       │ (Pixel Boxes Output)   │
       └────────────┬───────────┘
                    │
         ┌──────────┴──────────┐
         ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│  DomRenderer     │  │ CanvasRenderer   │
│ (React/CSS View) │  │(HTML5 Canvas View│
└──────────────────┘  └──────────────────┘
```

### Module Boundaries
- `src/spec.ts`: Pure specification primitives. Contains element roles, priorities, media aspect ratios, and validation logic.
- `src/surfaces.ts`: Immutable surface constraint profiles (safe areas, tap targets, viewing distance).
- `src/resolver.ts`: Core algorithm. Zero DOM/React dependencies. Operates strictly on geometric arrays and continuous aspect-ratio formulas.
- `src/render-dom.tsx` & `src/render-canvas.tsx`: Presentation adapters consuming `ResolvedLayout`. Renderers contain zero decision logic.
- `src/App.tsx`: Interactive studio application facilitating live surface switching, sandbox tweaking, and resolution telemetry inspection.

---

## 2. Algorithmic Complexity & Execution Guarantees

### Time Complexity: $O(N)$
Where $N$ is the number of elements in the ad specification (typically 4–8 elements).
- **Stage 1 (Constraint Calculation)**: $O(1)$
- **Stage 2 (Topology Synthesis)**: $O(1)$
- **Stage 3 (Degradation Cascade Solver)**: Maximum 6 iterations $\implies O(6N) = O(N)$
- **Stage 4 (Box Geometry Packing)**: $O(N)$
- **Stage 5 (Bounds Guard Enforcement)**: $O(N)$
- **Total Execution Time**: $< 0.5 \text{ ms}$ per frame.

### Space Complexity: $O(N)$
Stores pixel bounding boxes in an immutable dictionary `boxes: Record<string, ResolvedBox>`.

---

## 3. Geometric Solver & Spatial Topology Mechanics

The solver eschews hardcoded breakpoints (`if (surface === 'mobile')`) in favor of continuous mathematical topology synthesis:

### Aspect Ratio Vector Math
$$\text{UsableWidth} = W_{\text{surface}} - \text{Safe}_{\text{left}} - \text{Safe}_{\text{right}}$$
$$\text{UsableHeight} = H_{\text{surface}} - \text{Safe}_{\text{top}} - \text{Safe}_{\text{bottom}}$$
$$AR = \frac{\text{UsableWidth}}{\text{UsableHeight}}$$

### Spatial Topology Mapping

```text
                       Aspect Ratio (AR)
          0.75                             2.0
───────────┼────────────────────────────────┼───────────►
 Vertical Stack         Split Grid         Horizontal
(Tall Interstitial)  (Kiosk / Landscape)  (Lower Third)
```

1. **Vertical Stack Topology ($AR \le 0.75$)**:
   - Single vertical flex column.
   - Elements ordered top-to-bottom by role priority.
   - Action CTA anchored to bottom safe area.

2. **Split Grid Topology ($0.75 < AR < 2.0$)**:
   - **Wide Split ($AR > 1.1$)**: 2-column layout. Left column (45% width) holds Hero product media; right column holds Branding, Headline, Price, CTA stack.
   - **Balanced Grid ($0.85 \le AR \le 1.1$)**: Hero media occupies upper pane (~45% height), lower pane holds structured content.

3. **Horizontal Banner Topology ($AR \ge 2.0$)**:
   - 3-column horizontal layout. Left: Branding/Headline; Center: Hero product media & Price; Right: Action CTA button.

---

## 4. Priority Degradation Cascade Flowchart

```text
[ Start Layout Pass ]
         │
         ▼
[ Measure Total Content Dimensions vs Usable Bounds ]
         │
         ├────── (Content Fits Bounds) ──────► [ Generate Final Boxes ]
         │
         ▼ (Overflow Detected)
[ Pass 1: Reduce Hero Image Scale (1.0 -> 0.7) ]
         │
         ├────── (Content Fits Bounds) ──────► [ Generate Final Boxes ]
         │
         ▼ (Overflow Detected)
[ Pass 2: Truncate Price Copy & Reduce Font Size ]
         │
         ├────── (Content Fits Bounds) ──────► [ Generate Final Boxes ]
         │
         ▼ (Overflow Detected)
[ Pass 3: Drop Priority 3 Branding Logo (visible = false) ]
         │
         ├────── (Content Fits Bounds) ──────► [ Generate Final Boxes ]
         │
         ▼ (Overflow Detected)
[ Pass 4: Drop Priority 2 Price Copy (visible = false) ]
         │
         ├────── (Content Fits Bounds) ──────► [ Generate Final Boxes ]
         │
         ▼ (Overflow Detected)
[ Pass 5: Compress Hero Image Scale to Minimum (0.45) ]
         │
         ├────── (Content Fits Bounds) ──────► [ Generate Final Boxes ]
         │
         ▼ (Overflow Detected)
[ Pass 6: Scale Headline to Min Font Size (Protect Headline & CTA) ]
         │
         ▼
[ Generate Final Boxes with Telemetry Warnings ]
```

---

## 5. Extension Points for Future Scale

### A. Print Bleed & Broadcast Safe Title Zones
Broadcast television standards demand 80% Action Safe and 90% Title Safe areas. Print requires 3mm outer bleed margins.
- **Implementation**: Extend `SurfaceProfile.safeArea` dictionary to contain `titleSafe` and `actionSafe` insets. The resolver ingests these insets at Stage 1 without changing the degradation loop logic.

### B. Text Measurement Backend Integration
Currently, font box heights are estimated using font metrics.
- **Implementation**: Pass an optional `textMeasurer: (text: string, fontSize: number, maxW: number) => { width: number, height: number }` callback into `resolveLayout`. The resolver invokes this callback during Stage 4 to achieve pixel-exact multiline text wrapping decisions.
