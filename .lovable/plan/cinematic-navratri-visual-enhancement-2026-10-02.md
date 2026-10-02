# Cinematic Navratri Visual Enhancement

## Goal
Transform the existing Raas Mahotsav home page into a dramatic, premium festival opening while preserving all event details, prices, links, booking behavior, and database work.

## What will change
- Add a lightweight animated hero atmosphere with layered fireworks, drifting sparks and embers, depth haze, golden dandiya light arcs, warm diya glow, and a restrained moving crowd silhouette.
- Upgrade the main title reveal with layered gold depth, glow, scale, and a passing light sweep.
- Add a brief golden opening flash and make the primary booking button a tasteful glowing focal point.
- Add subtle celebratory spark accents at major section entrances and strengthen the page’s black, burgundy, maroon, antique-gold, and molten-amber visual depth.
- Preserve the current image, traditional ornamentation, content hierarchy, and mobile layout while making the first screen more immersive.

## Performance and accessibility
- Build the moving effects with CSS and one small canvas effect rather than video or large new media.
- Reduce particle density on smaller screens and pause the canvas when it is not visible.
- Disable nonessential movement when reduced motion is requested.
- Keep decorative effects ignored by screen readers and non-interactive.

## Technical details
- Create a focused hero-effects component responsible only for visual particles and firework timing.
- Extend the global semantic visual tokens and animation utilities for glow, haze, reveal, sparks, and section accents.
- Update only the home page presentation and shared visual styling; do not alter ticket, payment, booking, authentication, or database code.
- Verify the opening and major sections at desktop and mobile sizes, confirm reduced-motion behavior, and check the preview for errors.
