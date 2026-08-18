---
name: Daylight design system
description: Where the Cinematch "Daylight" v3 visual system lives and the rule for keeping its tokens in sync
---

The app's visual system is "Daylight" (v3), specced in `design_reference/README.md` with a reference HTML prototype in the same folder. Key rules: hairline borders only (1px rgba(36,31,29,.13)), warm soft shadows (no offset-block `3px 3px 0` comic shadows), Nunito / Nunito Sans / Space Mono type (never Caveat), all pastel accent fills carry dark `onAccent` #241F1D text — never white.

**Why:** the user handed off a high-fidelity spec and wants it followed exactly; earlier "comic sketchbook" styling is superseded.

**How to apply:** design tokens are duplicated in TWO places that must stay in sync — the `C` object in `client/src/lib/cinema-catalogue.ts` (inline-style pages) and the color palette in `tailwind.config.ts` (Tailwind-class pages like auth). Shared primitives live in `client/src/components/daylight.tsx`; legacy primitives in `client/src/components/ui/cinematch/` were restyled to match. Any palette change must update both token sources.
