# ADR 0003: Hand-built chart instead of a chart library

## Status
Accepted — 2026-10-20

## Context
The view must match the reference video closely: grouped + stacked bars, previous-period bars in lighter tones, event markers floating above a day, a custom legend and animated transitions when series or compare mode are toggled.

## Decision
The chart is built from HTML/CSS (`components/revenue-trend/*`): bar heights are percentages of a "nice" axis maximum (`lib/chart.ts`) and animate with CSS transitions. Export uses `html-to-image` on the whole card.

## Alternatives considered
- **Recharts** – grouped stacks need `stackId` per group and custom shapes/labels for the markers; matching the exact spacing and animation of the video meant fighting the library.
- **Chart.js (canvas)** – harder to style to the design and not reachable by keyboard/screen readers without extra work.

## Consequences
- One small dependency (`html-to-image`, lazy-loaded on click).
- Full control over layout, accessibility (each day is a focusable list item with a text summary) and animation.
- Axis/tick logic is ours to maintain (covered by `niceScale`).
