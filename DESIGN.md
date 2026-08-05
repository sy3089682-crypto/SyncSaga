---
version: alpha
name: 'SyncSaga: The Warm Voice'
description: "Shared experience, shared warmth. Golden amber accent on warm near-black canvas."
colors:
  primary: "#E8A840"
  secondary: "#0A0A0C"
  tertiary: "#F5E6D0"
  neutral: "#1A1A1E"
typography:
  display:
    fontFamily: "Fraunces"
    fontSize: "3.5rem"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  h1:
    fontFamily: Inter
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.2
  body:
    fontFamily: Inter
    fontSize: "0.9375rem"
    fontWeight: 420
    lineHeight: 1.55
    letterSpacing: "0.008em"
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#0A0A0C"
    rounded: "{rounded.md}"
    padding: 10px 20px
---

## Overview
SyncSaga is a shared watch party for anime. The UI feels like a voice — warm,
quiet, never shouting. Deep warm near-black canvas with golden amber as the
only accent.

**What makes this original:** Every sync/watch-party product uses cool accents
(blue, violet, blurple). This design chooses golden amber — like a dim lamp.
The color says "we're watching together."

## Colors
- **Canvas `#0A0A0C`:** Warm near-black, +2° warmer than Linear.
- **Surface `#1A1A1E`:** Card surfaces.
- **Elevated `#202025`:** Modals, tooltips.
- **Amber `#E8A840`:** Single accent — CTAs, active, presence states.
- **Chalk `#E8E0D5`:** Primary text. 14:1 contrast.

## Typography
- **Fraunces:** Display serif for hero & landing.
- **Inter 420:** Body text at custom variable weight.
- **JetBrains Mono:** Code, latency, system status.

## Elevation
Three-stage luminance stepping: Canvas → Surface → Elevated.
Ambient amber glow behind active elements communicates presence.

## Do's & Don'ts
**Do:** Use one accent amber. Fraunces for hero. Inter 420 for body.
12px rhythm. Ambient glow for active states. Positive body letter-spacing.
**Don't:** Mix accents. Use pill shapes on buttons. Apply deep drop shadows.
Center body text.
