# MASAR BMW — UI references and implementation (v2.0)

## Direction

Arabic RTL **Automotive Learning Dashboard**: calm enough for long study sessions, but with the visual discipline of an in-car information system. The interface keeps the project palette: navy, steel blue, muted sky blue, wine/crimson, soft neutral surfaces.

The goal is not to imitate a BMW operating system or use protected BMW UI assets. “Automotive” here means instrument-like hierarchy, compact status information, clear navigation, restrained motion, and high contrast.

## Component references used

| Reference | Pattern adopted in MASAR | Official reference |
|---|---|---|
| Magic UI — Bento Grid | Home information hierarchy, metric cards, learning command blocks, balanced asymmetrical grid | https://magicui.design/docs/components/bento-grid |
| Aceternity UI — Hover Effect / Card Spotlight | Restrained pointer-aware hover and depth on study cards; disabled for touch and reduced-motion users | https://ui.aceternity.com/components/card-hover-effect |
| Aceternity UI — Card Spotlight | Radial emphasis used only on selected premium surfaces, not long-reading content | https://ui.aceternity.com/components/card-spotlight |
| shadcn/ui — RTL | Logical RTL direction, segmented controls, sidebar/dialog interaction principles, large touch targets | https://ui.shadcn.com/docs/rtl |
| shadcn/ui — Direction | Explicit RTL direction is treated as an application-level concern | https://ui.shadcn.com/docs/components/aria/direction |
| React Bits | Motion and count-up inspiration for non-essential dashboard details | https://reactbits.dev/ |

## Why the production app is still not React

The current MASAR application already contains a large amount of working study logic: 48 lessons, quizzes, local IndexedDB, personal PDF importing/reading, notes, spaced review, sign practice, offline/PWA behavior, and browser tests.

Installing React only to obtain visual components would force a high-risk rewrite of that working layer. Therefore v2.0 takes the **interaction and layout patterns** from the libraries above and implements them in the current dependency-free HTML/CSS/JavaScript architecture.

This is deliberate, not a limitation disguised as a migration. A true React/Vite conversion should happen as a separate architecture project with parity tests for every existing learning workflow before switching production.

## v2.0 shipped patterns

- Automotive glass top bar with contextual review-due indicator.
- Persistent desktop **Focus Mode** that removes the sidebar and centers the lesson reading workspace.
- Five-item mobile navigation dock for the routes used most during study.
- Home hero changed into an automotive status surface: current week, due reviews, mastered signs, watched videos, overall progress.
- Magic-UI-inspired bento rhythm across home statistics and learning tasks.
- Aceternity-inspired card elevation and restrained spotlight behavior.
- shadcn-inspired segmented controls and tighter RTL spacing.
- Larger interactive targets for quizzes, signs, tabs and navigation.
- More consistent surface radii, borders, shadows and content widths across lessons, quizzes, videos, sources and review.
- Reduced-motion and touch-device fallbacks retained.

## Accessibility rules

- Motion is decorative only; core information never depends on animation.
- prefers-reduced-motion disables page/card transitions.
- Hover elevation is disabled on touch-only devices.
- Keyboard focus remains visible.
- Mobile dock keeps commonly used routes reachable with one thumb.
- Lesson Focus Mode does not remove content; it only removes navigation chrome.
- Arabic direction is RTL from the document level and directional UI should use logical start/end behavior.

## React migration candidate — later

If MASAR is migrated to React, the preferred production stack is:

- Vite + React + TypeScript
- shadcn/ui with RTL enabled from project creation
- Tailwind CSS
- source-owned Magic UI / Aceternity components copied into the repository and restyled to MASAR tokens
- Motion only where it improves feedback
- existing IndexedDB model preserved behind a typed data layer
- Playwright parity tests before replacing the static production build

The migration should not begin by rewriting all 48 lesson views at once. Start with the shell/navigation and one lesson route, prove data/save/PDF parity, then migrate feature groups.

## Quality gates

- JavaScript syntax checks
- dataset validation
- compiled index.html reproducibility
- smoke tests
- Chromium learner journey
- mobile viewport checks
- reduced-motion-safe CSS
