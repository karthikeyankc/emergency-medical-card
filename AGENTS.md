# AGENTS.md

## What this is

Emergency Medical Card is a website that makes a wallet card, also called a medical ID card, for a person with a medical condition. The person, or someone helping them, fills a form on the left and watches the card build itself on the right. When the card is complete they download it as a PDF for a print shop, a sheet to print at home, a PNG, or an SVG. Two card sizes ship, the bank-card ID-1 and the A7-sized ID-2, and the same content also downloads as a phone lock screen image.

Everything runs in the browser. Nothing the person types leaves their device.

The first users are the author and his father. Their cards are in English, and the second language on the bilingual card is Tamil. Tamil is the first proof that the text pipeline handles a complex script. Nothing in the code may be specific to Tamil or to English.

The person who carries the card should feel they are carrying a well-made personal card. The stranger who finds them in an emergency must read the essentials in seconds. Design for both at once. The rules below on type size, contrast, and layout exist for the second reader.

## v1

The v1 deliverable is a printed ID-1 card (85.60 × 53.98 mm) for two real people, together with the tool that made it.

Ship in this order. Each step is usable on its own.

1. Editor shell. Form on the left, live preview on the right, state in `localStorage`. English only, single-language layout.
2. Text pipeline. Shaping and outlining through HarfBuzz, so the preview and every export share one SVG.
3. Exports. SVG, PDF, and PNG from that SVG.
4. Bilingual layout with Tamil, verified on a physical print by a native reader.
5. Condition catalogue with names in each language and sourced suggestions, plus custom conditions and picked or uploaded icons.
6. Accessibility audit, print guide, polish.

All six are built. A native reader has not yet read a printed Tamil card, so `ta.json` stays marked unreviewed. The VoiceOver pass that `docs/a11y-audit.md` lists as outstanding has not been done either. Everything else is in the Later section and stays there until it is pulled in on purpose.

## Hard rules

These hold for every task. If a task needs one broken, stop and say so.

- **Client-side only.** No backend, accounts, cookies, analytics scripts, trackers, error reporting, or requests to another origin at runtime. The host's own visitor counts, which need nothing on the page, are the only measure of use, and the privacy page says so. Fonts, WASM, icons, and data are bundled and served from the app's own origin. Form content never appears in a URL or a request. Download filenames carry the person's name and nothing else from the form.
- **The tool renders text. It does not write medical advice.** Nothing clinical is generated, inferred, translated, or computed at run time. Suggested DO and DO NOT text for a condition is drafted ahead of time from named public first-aid pages (with AI, as `AI.md` records), cites them in the editor beside the field, states whether a clinician has reviewed it, and is always editable. Editing it shows a warning to check the wording with a doctor and that the tool takes no responsibility for what is printed.
- **One renderer.** A single function turns state into an SVG document. The preview shows that SVG. Every export is made from that SVG. No format gets its own layout code.
- **Text is never shrunk to fit.** Overflow is fixed by cutting content. The form says which field to cut, and export is blocked until the card fits.
- **No missing glyphs.** Every code point in every field is checked against the loaded fonts. A character the run's font lacks (a middle dot beside Tamil, say) is tried in the other loaded fonts, and it counts as missing only when none of them has it. A miss blocks export and names the characters and the field. `.notdef` never reaches an output.
- **Language is data.** Adding one means an entry in `src/data/languages.json`, a strings file, a font for its script, and catalogue labels. No code path branches on a language code.
- **Copy is written the GOV.UK way.** Short sentences, "you", one instruction per sentence, no jokes or figures of speech, sentence case. Under DO NOT every line completes the heading, so "Give me insulin", never "Do not give me insulin".
- **The editor meets WCAG 2.2 AA.** The printed card follows its own contrast and type rules below.
- **JavaScript only.** No TypeScript, `.ts` files, or build-time type checking. Document a module's inputs and outputs with JSDoc where the shape is not obvious from the code.

## The editor

One page for the editor, plus `/privacy` and `/terms`. A form column and a preview column, stacked on narrow screens with the preview first. On a wide screen the preview stays in view while the form scrolls. The preview has two tabs, the person's card and an example card, and downloads are disabled while the example shows. Everything about the card as an object lives on the preview surface. A Card or Phone toggle shows either the two sides with their fill gauges or the lock screen image inside a phone outline, rendered from the phone format, so the person sees what the phone will show before they download it. The phone view also shows a tip on setting the image as wallpaper and on filling in the phone's own Medical ID or emergency information.

A menu bar sits directly above the card. It holds File (save a copy, open a copy, clear this card), Language (the card's language, and a second language or none, which makes a one-language card), Size (the two card formats), and Look (the five colour pairs, the typeface, the emblem, and the optional date). Download sits at the right-hand end and opens leftward, so its menu stays inside the panel. Each menu opens under its own button. A menu of actions or choices (File, Size, and Download) closes once one is picked. A panel of settings (Language and Look) stays open until the person clicks away or presses Escape. The menus are Ken dropdowns on ghost buttons, and the arrow keys move between their items.

Download is the one primary button, a Ken dropdown whose menu lists every format (PDF for a print shop, print at home, lock screen image, PNG per side at 600 or 300 dpi, and SVG). PNG density is chosen there. Clear asks for confirmation in the page before it removes anything.

The form column holds only content, in the order a person knows it. Its sections are who the card is for (name, year of birth, and blood group), the condition (with its icon and other conditions), how to help (DO, DO NOT, and what they carry), medicines and allergies, emergency contacts with the country and its emergency numbers, other details (hospital and address), and the QR code.

There is no UI framework. Client code is a small store (one state object, a `set` that saves and notifies, and subscribers) plus DOM-updating functions grouped by panel. Repeating groups such as medications and contacts are `<template>` elements cloned per item. Keep to that one pattern.

The preview re-renders within 100 ms of a keystroke, debounced. In the card view it shows both sides, side by side or stacked as the column allows, scaled to fit. The card images are `aria-hidden`. The form is the accessible representation of the card, and the SVG carries no live text in any case.

State lives in `localStorage` under a versioned key and is saved on every change. The app asks the browser for persistent storage so the card is not evicted under pressure. A help line under the card says it is saved in this browser only, and once anything is typed the line adds that browsers can forget and asks for a saved copy. Save a copy and Open a copy in the File menu export and import the state as a JSON file, so a card can be rebuilt later or moved between devices. Clear this card removes the stored card and any font taken from the user's computer, as a shared computer keeps the card until someone clears it. There are no accounts and no card switcher. Several cards means several backup files.

The preview's Example tab shows a complete sample card in the person's chosen colours and typeface, so a first visit shows the finished thing. It never touches the person's own card. The renderer draws EXAMPLE across each side of the sample, in outlined text like everything else, so it cannot pass for a real card.

The editor is designed for older users first. Inputs are 48 px tall with 18 px text. Buttons are 40 px, the normal size. Small controls (tabs, the menu bar buttons including Download, and add-item buttons) are 36 px. Labels are plain words. Help that matters for privacy or for getting the card right stays visible under the field. Everything else sits behind a question-mark icon beside the label, as a tooltip that also works from the keyboard and opens on a tap. When a tooltip opens, `src/scripts/tips.js` measures its icon and shifts and narrows the bubble so it stays inside the screen. Nothing times out. Every error names the problem and the fix.

The form guides the fill. Until the required fields are filled, Download stays focusable but is marked `aria-disabled`. Hovering or focusing it shows a Ken tooltip listing what is missing, and pressing it goes to the first missing field. On a touch screen, pressing it opens the list in a drawer from the bottom, and each row goes to its field. The same tooltip says why Download is blocked on the example card or on a card with an overflow or a missing glyph. A gauge per side shows how much room is left, computed from the actual layout. A field that overflows is named in a callout, and its overflow is hatched in the preview.

## Formats and layouts

A **format** is a data object describing a physical or on-screen surface. It carries the size (in millimetres unless it names other units), corner radius, safe margin, its sides, and the named regions (slots) on each side. It may also carry a `canvas`, the drawing units the layout works in, and a `frame`, a ground the side is drawn onto. The Size menu offers two card formats. `id1-landscape` is the wallet card. `id2-landscape`, 105 × 74 mm, is an A7 pocket card for people who want larger type and do not need a card slot. The pocket card carries the same content in larger type, so it draws on the wallet card's grid scaled up by the width ratio (a `canvas` on the format, 85.6 × 60.3 drawing units mapped to 105 × 74 mm). Body text comes out at about 9.2 pt, and the taller aspect leaves a little more room. The QR code is specified in physical millimetres and is divided by the scale so it stays the size the user chose.

A third format, `phone-lockscreen`, is not a card and is not in the Size menu. It is 1080 × 2400 px (`units: 'px'`) with one side, `screen`. Its canvas is the card-shaped panel, 72 units wide, and its frame is the whole screen, 78 units wide, painted in `lock-ground`. The panel sits three units in from each side and runs from 22% of the height, below the clock, to 87%, above the controls. The renderer paints the frame's ground, moves to the panel, and draws the side there with its corners clipped, so the region maths is the same as a card's. The units behave as millimetres at about 352 ppi, so 7.5 pt body text comes out at about 37 px and the card's type floors still hold. Other formats are in Later. A surface such as a watch face would be declared the same way, in millimetre units at its device density.

A **layout** maps fields to slots for a given format and language mode.

**Single language.** One language, chosen by the user, English by default. Content is split across the two sides. The front carries what a finder needs in the first ten seconds and the back carries the rest. The back carries the emblem in its top-right corner and the first row stops short of it, so a card picked up face down still reads as a medical card without spending a band's height.

| Side | Content |
|---|---|
| Front | Alert band with name, year of birth, and blood group, condition strip, DO, DO NOT, what they carry |
| Back | Emblem in the top-right corner, then medications, allergies, other conditions, contacts, hospital, emergency number, address |

**Bilingual.** The first language on the front and the second on the back. Both sides carry the same blocks, DO and DO NOT, medications beside allergies, the contacts with the emergency number inside them, and what they carry. Hospital, other conditions, and the address are not on the bilingual card. Both sides are compact, with a one-line band holding the emblem, label, and name, the year and blood group as icon chips on the condition strip, and 7 pt body text. The space budget is set by whichever language runs longer, and what remains is for the user to cut.

**Phone.** One side for the `phone-lockscreen` format, in the card's first language, with the front's content first. Every block has its own row except two short pairs, allergies beside other conditions and hospital beside the emergency number. It has no QR code, as the phone showing the image cannot scan it. A bilingual card's lock screen image is in its first language.

Adding a layout or a format adds data and, at most, a slot-arrangement file. The renderer does not change.

## Card content

A required field blocks download until it is filled. Until then, and for optional sections the layout always shows, the card prints None, and the condition strip reads Condition – None, so no heading stands alone.

Values that carry text exist per language in bilingual mode. Values that read the same in any script (years, phone numbers, blood group, dates) are entered once. Each translated field is ticked "Same as" the first language until the user writes its own text.

| Field | Required | Notes |
|---|---|---|
| Full name | Yes | Per language. |
| Year of birth | Yes | Year only, from 1900 to the current year. A lost wallet is read by strangers. |
| Condition | Yes | One, from the catalogue or typed. It sits on the strip under the band. Anything else goes in Other conditions. |
| DO | Yes | Up to four imperatives, each marked with a check. |
| DO NOT | Yes | Up to four imperatives, each marked with a cross. Each line completes the heading, so it reads "Give me insulin", never "Do not give me insulin". The editor's help and every catalogue suggestion follow this. |
| What they carry | No | Item and where on the body. |
| Medications | No | Name, dose, and frequency. Prints None when empty. |
| Allergies | No | Prints None known when empty, in body text. Never blank, and never None, which would read as a promise. |
| Emergency contact | Yes | Name, relationship, and phone. The requirement is met once one contact has a phone number with at least six digits. The number prints exactly as typed. Help under the field suggests adding the country code for travel abroad, with the chosen country's code as the example. The placeholder shows the country's local number shape with its digits as x, from `src/data/phone-formats.json` (generated from libphonenumber by `npm run phone:refresh`). More contacts are optional. |
| Preferred hospital | No | |
| Other conditions | No | |
| Blood group | No | A chip on the band, chosen from a list (ABO with Rh, A1 and A2 subgroups, Bombay). The editor notes that hospitals type and screen before any transfusion. |
| Typeface | No | The Latin family, from the Look menu. Default Roboto Condensed, as it fits the most on a card. |
| Emergency number | Yes | The country menu lists every region the runtime knows, common ones first, each with its numbers when the table has them. Choosing a country fills both number fields. The bundled table covers 117 countries, each with the public page it was checked against and the date. The editor shows that date in a tooltip beside the country. For other countries the person types the number. Both fields are editable. Both numbers are digits only, and `ambulance` holds a second number only when it is an ambulance line. India renders both 112 and 108. |
| Address | No | Off by default, with a one-line privacy note. |
| Date | No | Off by default, and set in the Look menu. The month and year the card was updated, in the side's language with Latin digits, in the bottom-right corner of the back and of the lock screen image, where it takes no row. Content that reaches its line reports overflow. |
| QR code | No | Off by default. A MECARD of 14, 16, or 18 mm in the top-right corner of the back, left of the emblem, in the gap beside the medication timings. The contact is named after the owner with the label "emergency contacts" and carries up to three contact numbers. The user ticks what else rides along, the primary condition (on by default), blood group, and hospital in the note, and the address. A meter under the options shows the module size as they change. Two numbers alone give 0.38 mm modules at 14 mm. Rows that reach its height stop short of it. The renderer reports overflow if modules fall below 0.33 mm. The card's full data does not fit a code this size, so the backup file is how a card moves to another device. |

## Languages

`src/data/languages.json` lists 54 languages, each naming its script, and the card can be in any of the 47 that are available. English is the default first language, and the second language is any other entry. Card text (the headings, the alert band, None, None known, and the Updated label) comes from `src/data/i18n/card/<lang>.json`. Every available language has a file. Each carries a `_reviewed` flag, true once a native speaker has checked it, and only English is true today. While a chosen language is unreviewed the editor says so in a callout and asks the user to read the headings on the preview. A language with no file at all falls back to English headings, and the callout says that too. A test shapes every heading in every file, upper-cased as the card prints it, and fails on a missing glyph. Editor text comes from `src/data/i18n/ui/<lang>.json` and ships in English only. Nothing in the code names a language. The second-language inputs bind to whichever language is chosen, the shaper learns its scripts from the font manifest, and the language menus are built from the list. Arabic, Urdu, Persian, Hebrew, Chinese, Japanese, and Korean appear in the menu marked not yet available. The first four wait for the bidi step, and the last three wait for a way to ship fonts of that size.

In the state, the base key of a localised value is `en` and holds the first language's text, whatever that language is. Other languages sit under their own ids and fall back to it.

### Fonts

The Latin face is the user's choice from the typeface list in the Look menu, and it also sets Greek and Cyrillic. Atkinson Hyperlegible Next has no Greek or Cyrillic and misses some Vietnamese letters, and a font from the user's computer can lack anything. Noto Sans (the manifest's `fallback`, static Regular and Bold files under `src/fonts/latin/`) fills the Latin, Greek, and Cyrillic characters the chosen family lacks. It loads the first time such a character is missing, and never otherwise. Every option in the list is one variable TTF with Regular and Bold on the weight axis, and the condensed options are the same file with a width set on the wdth axis. Every other script has one variable Noto Sans font under `src/fonts/noto/`, seventeen today, covering the Indic scripts, Sinhala, Thai, Khmer, Lao, Myanmar, Georgian, Armenian, and Ethiopic. A script's font is fetched only when a language that needs it is chosen, so the first load carries the default Latin family alone. `manifest.json` records every family and script with its file, axes, licence, and source. All fonts are under the SIL Open Font License.

| Option | Why it is offered |
|---|---|
| Inter | The editor's face. |
| IBM Plex Sans, and Condensed at 85 percent width | Neutral and a little narrower than Inter. The condensed cut saves room. |
| Atkinson Hyperlegible Next | Designed by the Braille Institute for low-vision legibility, with letterforms that cannot be mistaken for each other. |
| Roboto, and Condensed at 75 percent width | Familiar from Android. The condensed cut is the most space-saving option and the default. |
| Arimo | Metric-compatible with Helvetica and Arial, for anyone who wants that look. |

Helvetica and Times New Roman are proprietary and cannot be bundled. A serif at 7.5 pt regular prints worse than a sans, so the list has no serif. The last option, "From my computer", takes a font the user already has, and choosing it opens a panel under the menu bar. They choose a file in any browser, or pick from installed fonts where the browser offers `queryLocalFonts`. Collections such as Helvetica.ttc are read face by face, and Regular and Bold are picked by style name, with Bold falling back to Regular when none exists. The file is kept in IndexedDB on the device. It is never written to the backup file and never leaves the browser. The user's own licence covers their use of it, and the tool distributes nothing. The coverage check applies to it like any other font. Adding a bundled family means adding a file and a manifest entry.

Icons and chips centre on the cap height, which the shaper measures from the outline of H for whichever family is loaded, so alignment holds when the font changes.

Text is itemised into runs by Unicode script property. Digits and punctuation join the neighbouring run. Each run is shaped with the font for its script. Phone numbers use tabular figures (`tnum`).

### Scope

The card supports left-to-right scripts. Right-to-left scripts and bidirectional text need the bidi step in the pipeline and mirrored layouts, and are in Later. CJK needs a font strategy for files of tens of megabytes. Vertical scripts are out of scope. Right-to-left and CJK languages are listed in the menus, marked not yet available, and cannot be chosen.

## Text pipeline

Tamil, like every complex script, needs shaping. Characters reorder, combine, and position against each other. A PDF or canvas library that places characters one at a time produces output that looks plausible and is wrong. Treat that as a correctness bug.

The pipeline runs on every render.

1. Normalise input to NFC.
2. Itemise into runs by script and pick the font per run.
3. Shape each run with `harfbuzzjs` (HarfBuzz compiled to WASM, vendored). The result is glyph ids with advances, offsets, and cluster indices. A cluster that comes back as glyph id 0 is shaped again with each other loaded font until one covers it. A cluster no font covers is a coverage failure. The preview still draws, the field and character are named, and export is blocked.
4. Break lines using the shaped advances. Break opportunities come from `Intl.Segmenter` at word granularity, which handles space-delimited and dictionary-broken scripts alike. Closing punctuation stays with the word before it and opening punctuation with the word after, so a line never starts with a full stop or ends with a bracket. Never break inside a cluster.
5. Convert glyphs to outlines with the same library's `glyphToJson` and emit `<path>` elements positioned in the format's units.

Every piece of text in the SVG is a path. There is no `<text>` element, `@font-face`, or external reference. Ids inside the SVG carry the side name, as the editor inlines both sides into one document. The same SVG is the preview and the source of every export, so the print shop receives what the user saw.

Shaping runs on the main thread first. Move it to a worker only if measured render time exceeds the 100 ms budget.

## Condition catalogue

Conditions come from a curated seed file, `content/conditions.seed.yaml`. Each entry has a Wikidata id, optional name overrides, aliases, and optional sourced prefill. The seed holds thirty conditions and twenty carry prefill, drafted from the NHS, Diabetes UK, Asthma + Lung UK, Epilepsy Action, the Alzheimer's Society, the National Autistic Society, and the British Heart Foundation pages named in each entry. Each entry's `reviewedBy` states that no clinician has reviewed it yet. When one does, that field changes and the editor's note changes with it.

```yaml
languages: [en, ta]
conditions:
  - id: type-1-diabetes
    wikidata: Q124407
    name: { en: Type 1 diabetes, ta: "" }   # optional override of the Wikidata label
    aliases: { en: [T1D, IDDM] }
    prefill:                                # optional, editable in the form
      do: { en: [] }
      doNot: { en: [] }
      sources:
        - org: ""
          title: ""
          url: ""
          reviewedOn: 2026-09-14
    reviewedBy: "Drafted with AI from the sources listed. Not yet reviewed by a clinician."
```

`npm run catalogue:refresh` runs `scripts/build-conditions.mjs`. For every seed entry it pulls the label and aliases in each supported language from Wikidata and applies the seed's overrides. It drops any label or alias not written in its language's script, as Wikidata sometimes files one under the wrong language. It fails on any prefill without `sources` and `reviewedOn`, and writes `src/data/conditions.json`. The output is committed, and every Tamil label is checked by a native reader before release. The app build reads only the committed file and needs no network.

The catalogue has no per-condition symbols, and the name on the strip identifies the condition. Every condition starts with the same generic icon, Lucide `stethoscope` in card ink. The user can change it in a picker with two tabs. Icons holds every Lucide icon, drawn in card ink. Symbols holds fourteen marks from Wikimedia Commons, such as the blue circle for diabetes and the awareness ribbons, in `src/data/symbols.json` with each author and licence named in the picker. The user can also upload their own SVG or PNG. Uploaded SVGs are sanitised on upload (scripts, external references, event handlers, and `foreignObject` removed, viewBox normalised, fitted into a square). An SVG with a raster picture inside it is turned away with a message to upload a PNG instead, as the picture has no size check. Uploads are drawn as images, so nothing inside them runs. Uploaded PNGs must be at least 600 px on the short side. Uploads keep their own colours.

The condition field accepts any name. It is a text input with the catalogue as suggestions, each name shown with up to three aliases. Any typed name is accepted, per language. Prefill applies only when the typed name matches a catalogue name or alias, and only while the DO and DO NOT fields are untouched.

The list grows through pull requests without code changes.

## Design system

The editor and the card have separate token sets. The brand colours are defined once and shared.

**Editor layer.** Tailwind CSS 4 through `@tailwindcss/vite` in the Astro config, with tokens in `@theme` in `src/styles/app.css`. The structure follows Ken Design System at `~/Desktop/Karthi/ken-design-system`. Take from it the semantic surface, text, and boundary tokens, shadows for surfaces and borders for controls, the focus glow, the motion tokens, the type scale and its tracking curve, `.dark` on `<html>`, one primary action per surface, and error states made of signal, statement, and recovery. Ken is a reference. Do not import the package or its component classes. The primary hue is the card's red (oklch hue 25) with the 600 stop calibrated to pass APCA 75 on white. The primary and the error colour share that red, so errors never rely on colour alone. Where a form section matches a card section (condition, medicines, contacts, and the hospital under other details), its title carries the same Lucide icon, so the form and the card read as one object.

**Card layer.** Tokens in `src/card/tokens.js`, in millimetres and points, consumed by the renderer directly so an exported SVG is self-contained. Tailwind does not touch the card.

`scripts/build-tokens.mjs` writes the shared colour tokens from `tokens.js` into `src/styles/tokens.css` so the two layers cannot drift. It runs as part of `npm run build`, as does `scripts/build-og.mjs`, which draws the social preview image from the logo and the example card through the same renderer, and the app icons from the logo. `build-conditions`, `build-icons`, `build-symbols`, and `build-phone-formats` run by hand, and their output is committed. `build-conditions` and `build-symbols` touch the network. `build-icons` reads the installed Lucide package, and `build-phone-formats` reads the installed libphonenumber-js metadata.

### Card tokens

| Token | Value | Use |
|---|---|---|
| `ink` | `#111111` | Body text, icons, rules |
| `paper` | `#FFFFFF` | Card background, emblem field |
| `alert` | `#7F1710` | Alert band fill and emblem, by default. The band and strip follow the chosen theme in `palettes` |
| `do-not` | `#7F1710` | The DO NOT block, fixed whatever the theme |
| `alert-ink` | `#FFFFFF` | Text, chips, and icons on the alert band |
| `do` | `#0B4E24` | The DO block, paired with `alert` on the DO NOT block |
| `condition` | `#F7C600` | Condition strip fill. Ink on it measures ΔL* 77 |
| `strip` | 5 mm | Condition strip height |
| `rule-muted` | `#767676` | Hairline dividers, never text |
| `lock-ground` | `#1C2024` | Ground of the lock screen image around the card, dark so the phone's white clock stays readable |
| `corner-radius` | 3.18 mm | Preview mask and SVG clip |
| `safe-margin` | 3 mm | Nothing closer to the edge |
| `band` | 13 mm | Alert band height on the front |
| `emblem` | 6 mm | Emblem square in the front band |
| `emblem-corner` | 5 mm | Emblem in the top-right corner of a side without a band |
| `qr`, `qr-quiet` | 14 mm, 1.6 mm | QR code side and quiet zone |
| `label-icon` | 2.6 mm | Icon beside a section label |
| `condition-icon` | 2.6 mm | Icon on the condition strip, same as section icons |
| `text-body` | 7.5 pt / 1.2 | Body text |
| `text-label` | 6 pt bold caps, +40/1000 | Section labels, in ink except the DO and DO NOT pair |
| `text-name` | 9 pt bold | Name, knockout on the band |
| `text-chip` | 7 pt bold caps, +30/1000 | Year of birth and blood group chips on the band |
| `text-condition` | 7 pt bold caps, +40/1000 | Condition strip, label and name on one line joined by an en dash |
| `text-alert` | 8 pt bold caps, +60/1000 | Alert band label |
| `rule` | 0.3 pt | Chip outlines and any divider |

### Card design intent

The card reads as a personal ID card of good quality, in the register of a bank card. The alert band is the one loud element, and everything else is calm. No warning triangles as decoration, skulls, or the word PATIENT. Corners are rounded in the preview so the person sees the object they will carry, and the export is a full rectangle for the shop to cut.

The band carries the emblem, the alert label, the person's name in knockout, and the year of birth and blood group as outlined chips on the right. Directly under it a solid strip, yellow by default, carries the condition icon, then the caps label and the primary condition name in caps on one line, joined by an en dash so a long name has the full width. The band and the strip together are the finder's first glance. The emblem is a red cross on a white field. It sits in a white square at the head of the band, drawn in `alert`. A white cross on a red ground is a different symbol.

The stranger's path through the front is fixed. Band with name, strip with condition, then DO and DO NOT. The band and strip take one of five colour pairs, red and yellow by default, chosen for a child's card or a preference, and every pair keeps white on the band and ink on the strip at ΔL* 70 or more. The emblem and the DO and DO NOT pair never change with the theme. They carry the largest type, the most contrast, and the most space around them. Colour marks zones only. Any information colour carries is also carried by words or position. Body text is ink on paper, and it is never grey, italic, justified, or set on a tint. The one exception is the DO block (label, icon, and items) set in the green and the DO NOT block set in the alert red. A stranger already knows what that pair means, and both colours clear the print rule against paper. No other section is coloured, since at 6 pt any hue dark enough to print collapses toward black and only adds noise. Sections have no background tint, as the padding a tint needs takes too much of the card. The condition strip is a solid, and ink on it is measured like any other pair. The band and strip are the only coloured grounds, and text on them is knockout white or ink.

### Visual principles

The renderer follows these Gestalt rules. A change to the layout is checked against them.

- **Proximity.** Space groups related content. The gap between sections is larger than the gap between a label and its content, and there are no rules between sections. A value stays close to its name, which is why key-value rows use a tab stop instead of right alignment across the full width.
- **Similarity.** Every section label has the same form, a 2.6 mm Lucide icon then caps text in the same size and colour. Icons are centred on their drawn shape, measured at build time, so an icon whose artwork sits low in its box still lines up. Icons support the words and never carry meaning alone.
- **Common region.** The band is identity and the strip is the condition, each read as one region. Below them, space and alignment make the regions. DO and DO NOT share a row and are set as a green and red pair, the one place the paper side uses colour. Chips are outlined so a fact reads as a unit.
- **Continuity.** One left edge for labels and text. DO and DO NOT items hang a check or a cross in the indent so the text edge stays straight, and the mark repeats the block's meaning on every line. Values in key-value rows start where the second column of a two-column row starts, so a side has one value column.
- **Figure and ground.** Ink on white under two saturated bands. Nothing else competes for the finder's first glance.
- **Hierarchy.** Size and weight step down in the order the finder needs them. Name and condition first, instructions second, everything else at body size.
- **Numbers.** Tabular figures wherever a number appears, so digits line up and phone numbers read as phone numbers.

Print contrast is measured as CIELAB lightness difference, ΔL* ≥ 70 between text and its background, on the token pairs above. APCA and WCAG ratios are screen measures. Do not run them on print output.

Follow RNIB Clear Print on the card. Sans-serif at Regular or Bold, left aligned, leading at least 1.2. Rules are at least 0.25 pt and knockout text is at least 7 pt bold.

### Findability

The page is written to be found and summarised correctly. It has a plain title and description, Open Graph and Twitter tags, a web manifest with PNG icons, `robots.txt`, and `llms.txt` for answer engines. With `SITE_URL` set at build time it also gets a canonical URL, an absolute social image, and a sitemap, and the build adds the sitemap's address to `robots.txt`. Without it the build warns. The JSON-LD is one linked graph of the `WebSite`, its author as a `Person`, the tool as a free `WebApplication` in the health category, and the page as a `WebPage` and `FAQPage` carrying the questions. The questions section itself is visible text on the page, seventeen short answers in plain words, so a person and a crawler read the same thing. They cover who a card is for and when it helps, the other names people search for (medical ID card, medical alert card, medical wallet card, ICE card), and how a card differs from a bracelet and from government health cards. The header is the H1 and one line saying nothing typed leaves the device, with more detail behind a help icon on screens wider than a phone. On a phone it is one row with the intro under it, so the preview starts near the top. The footer carries the notices (not medical advice, your details stay with you, and use at your own risk), links to the privacy and terms pages, the source, and issue reports, and the author's name.

### Editor design intent

Quiet and spacious, with the card as the hero. Inter for the interface, self-hosted through `@fontsource-variable/inter`. Every notice is a callout (`Callout.astro`, or `calloutHtml` from scripts) in one of four kinds, info, warning, success, and danger, with a light tint, a hairline border in its hue, and a Lucide icon. Callouts have no coloured stripe. Explanations that few people need, such as the law around the red cross, live in a tooltip beside the label. Lucide for every icon, rendered to inline SVG at build time through `@lucide/astro`, with `aria-label` on any icon-only control. Client code that needs an icon clones it from a `<template>`. Light and dark themes through the `.dark` class, with OS preference first and a stored preference winning. The export area holds exactly one primary button, Download, and its menu holds every format. Buttons, the dropdown, the tooltip, and the modal follow Ken's components, rebuilt in `app.css`. Every error shows an icon, a specific message, and the fix. `prefers-reduced-motion` is honoured.

## Exports

All formats come from the same SVG document. Every file is named after the person, `medical-card-<name>-<YYYY-MM-DD>.pdf`, and `medical-card-<name>-<side>-<YYYY-MM-DD>.<ext>` for per-side files. The lock screen image uses `lock-screen` as its side and the print-at-home sheet uses `print-at-home`. The backup follows the first pattern, so a family's downloads can be told apart. The name reveals nothing the card itself does not.

**PDF.** First in the Download menu, for a print shop. Two pages, front and back, each exactly the format's size (85.60 × 53.98 mm for ID-1, 105 × 74 mm for ID-2), vector throughout. Resolution does not apply to vector art, so it meets a print shop's 300 dpi requirement. Uploaded PNG icons are the only raster content and are embedded at their native pixels. Produced by `svg2pdf.js` on `jsPDF`, fed our SVG. The print guide in `docs/print-guide.md`, summarised in the README, says to print at 100% with scaling off, on 250 gsm or heavier matte stock, laminated.

**Print at home.** One PDF page, A4 or Letter by the country's paper (`src/data/paper.json`), made from the same side SVGs by `src/export/sheet.js`. The menu item names the paper. Front and back sit one above the other sharing an edge, with the back turned upside down so it reads the right way up after folding. Corner marks and fold marks sit outside the card, and nothing is printed on it. The content fits inside both paper sizes, so either prints the card at its true size. The ID-1 card comes two to a sheet and the ID-2 card one. After the download a callout says to print at actual size, cut, fold, and laminate.

**PNG.** Each side on its own for shops that reject vector files, or one lock screen image for the phone. A side is rendered from its SVG through an offscreen canvas at the chosen density, never by scaling a smaller raster, and its `pHYs` chunk is written with the true density. Without it, print software assumes 96 dpi and prints the card at the wrong size.

| Download menu item | Output | Pixels |
|---|---|---|
| Lock screen image | One portrait lock screen image, laid out for the screen | 1080 × 2400 |
| PNG, each side, 600 dpi | Two files with `pHYs` | 2022 × 1275 for ID-1 |
| PNG, each side, 300 dpi | Two files with `pHYs` | 1011 × 638 for ID-1 |

The lock screen image is the `phone-lockscreen` format rendered through the `phone` layout, one SVG rasterised at its pixel size. It carries no `pHYs`. A phone shows it without unlocking, so a finder can read it. If the one column overflows, the phone view names the fields and the lock screen item in the Download menu is disabled, while the card's own downloads are unaffected.

**SVG.** One file per side, `width` and `height` in `mm` with a matching `viewBox`, all text as paths, no `<style>`, fonts, or external references. Opens correctly in any vector tool without our fonts installed.

**JSON.** The form state, for backup and re-import, from Save a copy in the File menu.

## Code principles

**DRY.** One renderer, one token source, one state schema, one way of loading strings. When a change has to be made in two places, the structure is wrong. Fix the structure before adding the second copy.

**KISS.** Pure functions over plain data. No class hierarchies, plugin systems, or abstract base renderers. A format is an object. A layout is an object. Prefer the platform (`Intl.Segmenter`, `structuredClone`, `crypto.randomUUID`, `<template>`) to a dependency. Prefer a dependency to code we would have to maintain when the problem is hard, as with shaping and PDF.

**YAGNI.** The Later section is the only place unbuilt features live. No feature flags for unbuilt features, empty `case` branches for a third layout mode, or state fields nobody can set. Leave seams, which means data-driven formats and layouts, and build the extension when it is needed.

**Separation.** `state → layout → render → export`. Each is a module with documented inputs and outputs. State, layouts, and the renderer have no knowledge of the DOM and run in Node with a fixture and a font file. The export modules take the SVG string or the state and use the browser's canvas and `Blob`. The editor scripts are a thin layer that edits state and calls these.

**Schema first.** The state has a `version` field. Every schema change ships a migration from the previous version, and loading old state runs the migrations before anything reads it. Validate at the boundary (`localStorage`, JSON import, catalogue JSON) and trust the shapes inside. At load, a setting outside its list falls back to the default, and a condition icon is rebuilt from bundled data or dropped, since icon markup goes into the page and the SVG.

**Twelve-factor, where it applies to a static site.** One codebase. Dependencies declared in `package.json` with a lockfile, and every binary asset (fonts, WASM) vendored with its licence file beside it. Configuration through the environment at build time, limited to the base path (`BASE_PATH`) and the canonical site URL (`SITE_URL`), and never in code. Build and run are separate. `catalogue:refresh` and `phone:refresh` are manual steps whose output is committed, and the first needs the network. `build` is deterministic and offline. The same build runs in development preview and in production. The app holds no state of its own. Browser storage is the only state, and it belongs to the user.

**Fail loud in development, soft in production.** Assertions in the renderer and pipeline throw in tests and in dev. In production the same failure shows the user a message naming what went wrong (a missing glyph, an overflow, a bad import file) and never produces a wrong card.

**Tests that match risk.** Vitest renders cards in every mode and format, in English, Tamil, and Hindi, and asserts on the SVG. It also shapes every card heading in every language. Unit tests cover line breaking, coverage checking, migrations, import validation, the QR payload, the `pHYs` writer, and the data files (every emergency number cites a source and a date). One Playwright run fills the form, exports all formats, and asserts zero network requests. A second, `scripts/layout.mjs`, loads the editor at seven sizes from a 360 px phone to a 1920 px monitor, blank and filled. It checks that the page never scrolls sideways, the header stays compact, the four menus share one line, every menu opens under its button (full width under the bar on a phone) and inside the screen, every help tooltip opens inside the screen, and nothing spills out of its panel. The pre-commit hook in `.githooks/pre-commit` runs the drift check and the unit tests. The CI workflow in `.github/workflows/check.yml` runs `npm run check`, then the smoke test, the layout check, and the axe audit against a preview build. Automated tests catch regressions. Whether Tamil is shaped correctly is checked by a native reader on paper.

## Stack

- Astro with `output: 'static'` and `build.format: 'file'`, so the privacy and terms pages are served at `/privacy` and `/terms`, the URLs the canonical tags name. Vanilla JavaScript as ES modules in `<script>` blocks and `src/scripts/`. The pages are `/`, `/privacy`, and `/terms`, plus `404.html`, which the host serves for any other address with a 404 status. Without it, Cloudflare Pages treats the site as a single-page app and answers every unknown address with the editor.
- Tailwind CSS 4 through `@tailwindcss/vite`. Inter for the editor through `@fontsource-variable/inter`.
- `harfbuzzjs` for shaping and outlines. `jsPDF` with `svg2pdf.js` for PDF. Canvas for PNG. A hand-written `pHYs` chunk writer, about twenty lines. `qrcode-generator` for the optional QR code. `svg-path-bbox` at build time to centre icons on their drawn shape.
- Lucide through `@lucide/astro` in the editor. `scripts/build-icons.mjs` copies the icons the card uses into `src/card/icons.js` as data, so the renderer has no dependency.
- Vitest for units. `playwright-core` driving Chrome, or Playwright's Chromium when it is installed, for the smoke test and the axe audit (`axe-core`). `@resvg/resvg-js` for Node renders and the social image. `js-yaml` reads the condition seed. `libphonenumber-js`, a dev dependency, supplies the phone number shapes and is not shipped.
- MIT licence for the code. Fonts, icons, and symbols keep their own licences, listed in `NOTICE.md`.

```
src/
  headers.js    CSP and response headers, used by Base.astro and written to dist/_headers
  paths.js      Links inside the site, carrying the base path from BASE_PATH
  pages/        index.astro, privacy.astro, terms.astro, 404.astro
  layouts/      Base.astro (head: CSP, SEO tags, JSON-LD, manifest)
  components/   LocalisedField, Callout, Footer, Legal
  scripts/      Client JavaScript. store, form, fields, dropdown, tips, icon, customfont, preview, exports, fonts,
                languages, callout, main
  card/         Pure JavaScript. state, formats/, layouts/, render, tokens, emblem, icons (generated), qr,
                text/ (itemise, shaper, paragraph, outline, fontfile)
  export/       pdf, png, svg, sheet, json, download. Each takes the SVG string or the state. unused stands in for jsPDF's
                optional libraries.
  data/         conditions.json (generated), emergency-numbers.json, phone-formats.json (generated), paper.json,
                languages.json, example-card.json, symbols.json (generated), lucide-icons.json (generated),
                i18n/card/*.json, i18n/ui/*.json
  fonts/        <family>/*.ttf for Latin, latin/NotoSans-*.ttf as the fallback, noto/NotoSans<Script>-Variable.ttf per script,
                manifest.json, licences
  styles/       app.css (@theme), tokens.css (generated)
public/         favicon.svg, logo.svg, og.png, apple-touch-icon.png, icon-192.png, icon-512.png (the PNGs generated),
                manifest.webmanifest, robots.txt, llms.txt
content/        conditions.seed.yaml
scripts/        build-tokens, build-icons, build-symbols, build-conditions, build-phone-formats, build-og, render-fixtures,
                smoke, layout, a11y, check-docs
.githooks/      pre-commit, which runs check-docs and the tests
.github/        CI workflow, issue and pull request templates
tests/          unit tests, fixtures, helpers
docs/           print-guide.md, a11y-audit.md, emblem.md
```

The Vite config inside Astro emits `.wasm` as a local asset, and aliases jsPDF's optional html2canvas, DOMPurify, and canvg to an empty module, as the card's PDF never uses them. The production CSP lives in `src/headers.js` and is `default-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; style-src 'self'; script-src 'self' 'wasm-unsafe-eval'; object-src 'none'; base-uri 'self'; form-action 'self'`, so the page carries no inline styles, scripts, or event handlers. `Base.astro` puts it in a meta tag. The build writes `dist/_headers` for Cloudflare Pages with the same policy plus `frame-ancestors 'none'`, the other security headers, and a year's caching for hashed assets. Cloudflare's Web Analytics, Rocket Loader, Email Address Obfuscation, and Zaraz inject scripts and stay off.

## Emblem and project logo

The card emblem sits at the head of the alert band. The default is the red cross, as it is the mark a stranger under stress reads as medical. The red cross is a protected emblem under Geneva Convention I, Articles 44 and 53. In India, Section 12 of the Geneva Conventions Act 1960 prohibits its use for any purpose without Central Government approval, with a fine on conviction. The editor states this once, in a tooltip beside the emblem setting in the Look menu, and leaves the choice to the user. `state.emblem` accepts `red-cross` (default), `rod-of-asclepius`, and `none`. The red crescent, red crystal, and Star of Life are not offered. `docs/emblem.md` records the law and the decision.

Whatever the emblem, the alert band text reads EMERGENCY MEDICAL INFORMATION in the side's language, so the words carry the meaning when the symbol is not recognised.

The project's own logo, for the README, favicon, and app icons, is a separate asset. It never appears on a card, and it must not resemble any of the emblems above.

## Definition of done

1. `npm run build` succeeds with no network access, and the bundle loads nothing from another origin. Absolute URLs appear only as links a person follows (catalogue sources, symbol credits, and the author) and as XML namespaces.
2. The Playwright run exports every format with zero network requests.
3. `node scripts/layout.mjs` passes at every size it checks.
4. `node scripts/a11y.mjs` reports zero axe violations on the editor in light and dark themes and at phone width, and a keyboard and screen reader pass is logged in `docs/a11y-audit.md`.
5. A printed PDF measures 85.60 × 53.98 mm with a ruler at 100% scale.
6. Every text and background pair on the card meets ΔL* ≥ 70. No card text is below 7 pt except bold caps labels at 6 pt.
7. Tamil output is verified by a native reader on a physical print.
8. A missing glyph blocks export and names the character and the field.
9. The PNG carries a correct `pHYs` chunk and places at 85.60 × 53.98 mm in print software.
10. SVG, PNG, and PDF of the same state are visually identical at the same scale.
11. Every layout produces a valid result, and overflow blocks export with the field named.
12. Every prefilled clinical string in the catalogue has `sources[]` and `reviewedOn`, checked by the catalogue script.
13. State round-trips through JSON export and import unchanged.
14. `npm run check` passes, running the drift check, the tests, and then a build with no network access.
15. The documents match the code. `scripts/check-docs.mjs` fails on a dead path, an unknown npm script, a CSP or colour token that differs from the code, a stated count that differs from the data, or a bundled typeface NOTICE.md does not credit.

## Later

Nothing here has code, flags, or schema fields until it is pulled into a release.

- Other formats. Lanyard card (ID-1 portrait with slot-punch clearance), smart watch face. Each is a `formats/` entry and a layout file.
- The remaining Commons symbols, once `scripts/build-symbols.mjs` is rerun outside the rate limit. It is resumable.
- Right-to-left languages. Adds `bidi-js` (UAX #9) between itemisation and shaping, and mirrored slot arrangement. Arabic, Urdu, Persian, and Hebrew are already in the language list, marked not yet available.
- Chinese, Japanese, and Korean. Noto Sans CJK is tens of megabytes per weight. Subsetting at build time needs the text, so the likely route is a server-free on-demand subset by Unicode block.
- Native review of the 46 card heading files marked `_reviewed: false`.
- The editor translated into the card languages.
- Bleed, and an 8-up imposition sheet for print shops. The print-at-home sheet already has corner marks.
- Translation review images. One picture per language showing every heading as the card prints it, made by `render-fixtures` and linked from the translation issue template, so a native speaker can review a language without running the code.
- Clinical review of the prefilled DO and DO NOT text, recorded in each seed entry's `reviewedBy`.
- A single-file offline build that runs from `file://`.
- A plain-text view of the card for copying and for screen readers.

## Do not

- Add a backend, accounts, analytics, or any runtime request to another origin.
- Generate, reword, or translate clinical text.
- Shrink text to fit, or hide overflow.
- Place text one character at a time in any output, or use a PDF library's text API for card text.
- Fall back to a font outside the loaded set, or render `.notdef`.
- Add TypeScript, a UI framework, a second renderer, or per-format layout code.
- Style the card with Tailwind, or put `<text>`, `<style>`, or `@font-face` in an exported SVG.
- Hardcode a language, script direction, or font.
- Export a card PNG without `pHYs`, or below 300 dpi.
- Ship catalogue prefill without a source.
- Build anything from the Later list without moving it into the current release first.
