# MASAR BMW — UI inspiration and implementation (v1.1)

## Design direction
An Arabic RTL **automotive learning dashboard** with a restrained, legible interface. Palette from the owner's reference image: `#202D36`, `#5C7896`, `#7598B9`, `#3C0007`, `#800C1F`, `#929CAA`. Core workflows stay the same: 16 weeks, 48 lessons, quizzes, cards, notes, progress, IndexedDB.

## Official component references

| Original React resource | Adaptation in this project | Documentation |
|---|---|---|
| Magic UI — Bento Grid | Responsive dashboard tiles and learning-action cards | https://magicui.design/docs/components/bento-grid |
| Aceternity UI — Card Hover Effect | Lightweight, pointer-following card spotlight | https://ui.aceternity.com/components/card-hover-effect |
| React Bits — count-up animation patterns | Count-up animation of overview metrics (only when motion is allowed) | https://reactbits.dev/ |
| shadcn/ui — Toggle Group | Accessible single-selection filters for All / In progress / Completed | https://ui.shadcn.com/docs/components/base/toggle-group |
| Motion — reduced motion | Respect user's reduced-motion preference to avoid distracting or uncomfortable effects | https://motion.dev/docs/react-use-reduced-motion |

## Important implementation detail
These libraries are **references**, not dependencies bundled in the website. The repository remains a dependency-free **HTML/CSS/JavaScript** application deployed as static assets on GitHub Pages; the patterns above were adapted natively for compatibility and light loading. Do not claim that React packages are installed or that the current website is written in React. Moving to a true React/Vite project is a separate migration.

## Changes shipped
- Editorial hero and animated automotive illustration with reduced-motion fallback
- Premium bento dashboard and concentric progress visualization
- Better metric typography and restrained count-up animation
- Driving-route representation of upcoming lessons
- Spotlight hover on card surfaces, with keyboard focus styles retained
- Filterable 16-week catalog
- Improved mobile layout and floating timer positioning

## Quality gates
- `node smoke-test.js`
- `python compile.py`
- Browser checks at 390, 1024, and 1440px, including route navigation and filters
- GitHub Actions workflow `Validate MASAR BMW` must pass

## Editorial note
All educational content is still marked draft until checked against authoritative Saudi sources and vehicle model documentation.
