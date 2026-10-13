# BMW Hero — UI/UX Pro Max focused review

**Scope:** the home hero at `#/home` on desktop, tablet, and phone, in both dark and light modes.

**Method:** applied relevant public UI/UX Pro Max guidance (visual hierarchy, media prominence, responsive layouts, accessible legibility, and pre-delivery browser verification) to the current vanilla HTML/CSS/JS stack. The named skill is not installed as an executable tool in this chat, so this is an implementation of its published recommendations, not a claim of a local skill run.

Reference: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill

## Fixed observations

1. **BMW photo was almost invisible on mobile:** the prior CSS forced `opacity: .20` and placed the photo underneath text, where it read as a watermark. New layout gives the photo a dedicated, full-opacity stage below the text on viewport widths at most 900px.
2. **Desktop car was too dim and over-faded:** the image applied a darkening filter and strong full-width gradient. New sizing uses a larger 54% image area, higher brightness with controlled right-edge masking, and preserved text legibility.
3. **Mode parity:** custom brightness and a clear stage remain in both dark and light theme. Source colors remain BMW blue, black and white.
4. **External-image resilience:** image failures hide the broken remote image, revealing the existing offline SVG car; no remote image bytes or external credentials are cached.
5. **Motion:** no gratuitous animation was added; `prefers-reduced-motion` remains honored.
6. **Responsive checks:** Chromium E2E validates desktop image size/opacity, a mobile image below the hero copy, and no horizontal overflow. Existing tests cover dark/light persistence and the learning routes.

## Design decision

The BMW is the visual anchor, **not text decoration**. The readable lesson heading and primary action remain first in screen-reader and mobile visual order. The image itself is decorative (`aria-hidden` on the scene and empty alt on the photo) so assistive technology is not forced to read a redundant vehicle description.

## Follow-up audit opportunities

- Review contrast of secondary labels across *all* lesson components in both modes, with actual text/background screenshots.
- Validate 320px and 360px mobile widths in addition to the existing 390px route test.
- Review external photo availability in production over time and prefer a locally licensed optimized image for fully offline media where publishing rights permit.
- Expand the same consistency checklist to source, sign and quiz pages, while preserving the red colors that convey traffic regulation meaning.

**Important:** Automated tests verify rendered layout and fallback structure. They do not replace a manual subjective visual review on a real phone.
