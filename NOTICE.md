# Third-party notices

The code of this project is under the MIT licence, in [LICENSE](LICENSE). Everything below ships with the site under its own licence.

## Typefaces (SIL Open Font License 1.1)

Licence texts sit beside each font under `src/fonts/`.

- Inter, by Rasmus Andersson. https://github.com/rsms/inter. The card uses the TTF under `src/fonts/inter/`, and the editor uses the web font from `@fontsource-variable/inter`.
- IBM Plex Sans, by IBM. https://github.com/IBM/plex
- Atkinson Hyperlegible Next, by the Braille Institute of America. https://github.com/googlefonts/atkinson-hyperlegible-next
- Roboto, by Google. https://github.com/googlefonts/roboto-3-classic
- Arimo, by Steve Matteson. https://github.com/googlefonts/arimo
- Noto Sans, by the Noto Project Authors, used for Latin, Greek, and Cyrillic characters the chosen typeface lacks. https://github.com/notofonts/latin-greek-cyrillic
- Noto Sans Armenian, Bengali, Devanagari, Ethiopic, Georgian, Gujarati, Gurmukhi, Kannada, Khmer, Lao, Malayalam, Myanmar, Oriya, Sinhala, Tamil, Telugu, and Thai, by the Noto Project Authors. https://github.com/notofonts

## Icons

- Lucide, ISC licence. https://lucide.dev

## Symbols from Wikimedia Commons

Used in the icon picker's Symbols tab. Each is credited in the picker and in `src/data/symbols.json`.

- Asclepius staff, by Lusanaherandraton, public domain.
- Blue circle for diabetes, International Diabetes Federation, public domain.
- Autism spectrum infinity awareness symbol, public domain.
- International Symbol of Access, Rehabilitation International, public domain.
- White ribbon, by MesserWoland, public domain.
- Purple, grey, orange, green, teal, light blue, pink, and yellow ribbons, by MesserWoland, CC BY-SA 3.0. https://creativecommons.org/licenses/by-sa/3.0/
- Burgundy ribbon, by Jarick098, CC BY-SA 3.0.

The Rod of Asclepius emblem on the card is drawn from the same Asclepius staff file.

## Libraries in the site's code

- harfbuzzjs, MIT. HarfBuzz itself is under the Old MIT licence.
- jsPDF, MIT, with its dependencies fflate (MIT), fast-png (MIT), iobuffer (MIT), pako (MIT and Zlib), and @babel/runtime (MIT).
- svg2pdf.js, MIT, with its dependencies cssesc, font-family-papandreou, specificity, and svgpath, all MIT.
- qrcode-generator, MIT.
- Astro and Tailwind CSS, MIT.

jsPDF's optional html2canvas, DOMPurify, and canvg are not shipped. The build replaces them with an empty module, as the card's PDF never uses them.

## Data

The emergency number table (`src/data/emergency-numbers.json`) and the paper-size list (`src/data/paper.json`) are released under CC0 1.0. The suggested first aid text in `content/conditions.seed.yaml` and the card headings in `src/data/i18n/card/` are under CC BY 4.0.

- Condition names and aliases from Wikidata, CC0.
- Suggested first aid text drafted from pages by the NHS, Diabetes UK, Asthma + Lung UK, Epilepsy Action, Alzheimer's Society, National Autistic Society, and the British Heart Foundation, each cited in `content/conditions.seed.yaml`. The text is a paraphrase written for this project and remains the responsibility of this project.
