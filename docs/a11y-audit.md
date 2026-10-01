# Accessibility audit

The editor targets WCAG 2.2 AA. The printed card follows its own contrast and type rules in `AGENTS.md`.

## Automated

`node scripts/a11y.mjs <url>` runs axe-core with the WCAG 2.0, 2.1, and 2.2 A and AA rule sets plus best practice, against the editor with the example card loaded, in light and dark themes at 1400 px and in light at 390 px. It then walks the page with Tab and checks that the theme toggle, the preview tabs, the Card and Phone toggle, and the File, Language, Size, and Look menus can all be reached, and that the focused button shows a ring.

Last run on 25 September 2026 against the production build, with zero violations on all three passes and a clean keyboard walk. axe is injected through the automation channel, as the production Content Security Policy blocks script tags.

## Manual

These were checked by hand on 14, 15, and 25 September 2026, in Chrome on macOS.

- Every input has a visible label. Second-language inputs take their language name as label.
- Icon-only buttons (remove a medicine or contact, theme, and info) carry an `aria-label`.
- The card preview is `aria-hidden`. The form is the accessible representation, and the overflow and missing-glyph messages are in a live region.
- Selects are native, so the option list is the OS's own and works with a screen reader.
- Tooltips, including the one beside the emblem setting, are buttons. They're reachable by keyboard, and their text is also their `aria-label`, so a screen reader hears the help without hovering.
- Reduced motion is honoured globally.
- The preview tabs and the icon picker tabs use `role="tab"` with `aria-selected`, and the picker is a native `<dialog>` that traps focus and closes on Escape.
- Callouts that report errors carry `role="alert"`.
- The menus above the card are Ken dropdowns on buttons with `aria-haspopup` and `aria-expanded`. They open with Enter or Space, move with the arrow keys, and close on Escape, returning focus to their button.
- Download stays focusable when it can't be used, marked `aria-disabled`, and its tooltip says why. On a touch screen the reasons open in a drawer.

A full pass with VoiceOver reading the form top to bottom hasn't been done yet, and neither has a check with a switch or voice-control user.
