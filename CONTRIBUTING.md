# Contributing

Thank you. The most useful contributions are languages, conditions, and corrections to the emergency number table, in that order.

Before anything else, read [AGENTS.md](AGENTS.md). It's the specification, and it sets the rules the code follows. There's one renderer, text never shrinks to fit, no character is ever a missing glyph, nothing leaves the browser, and the code is plain JavaScript with no TypeScript.

## Setting up

```
npm install
npm run dev
npm test
```

`npm run check` runs the docs check, the tests, and the build. `node scripts/smoke.mjs <url>`, `node scripts/layout.mjs <url>`, and `node scripts/a11y.mjs <url>` run the browser checks against a dev or preview server, and default to `http://127.0.0.1:4321/`.

## Checking a language you read

Every available language except English has a heading file in `src/data/i18n/card/`, translated with AI and marked `"_reviewed": false`. If you read one of them natively, checking it is the most useful small contribution there is.

Open the site, pick the language in the Language menu above the card, and read the headings on the preview. The card prints them in capitals, so check how each one looks there and not only in the JSON. Report what you find with the [Check a translation](https://github.com/KarthikeyanKC/emergency-medical-card/issues/new?template=translation.yml) form, or send a pull request that fixes the file and sets `_reviewed` to `true`.

## Adding a language

1. Check `src/data/languages.json`. Most languages are already there. If yours is missing, add its id, English name, native name, and `script`. The script is a key under `scripts` in `src/fonts/manifest.json`, such as `latin` or `tamil`.
2. Add `src/data/i18n/card/<id>.json` with every key from `en.json` translated. These are the headings printed on the card. Until this file exists the language works but prints English headings. Set `_reviewed` to `false` unless a native speaker has checked the file. The tests fail when a key is missing, or when a heading in capitals has a missing glyph.
3. If the script has no font yet, add one variable Noto Sans TTF under `src/fonts/noto/`. Register it under `scripts` in the manifest with its Unicode script name, family, file, licence, source, and `verifiedAt7pt` set to `false`. Credit the family in NOTICE.md, as the docs check fails without it.
4. Add the language's id to `languages` at the top of `content/conditions.seed.yaml`, so the refresh pulls condition names in it from Wikidata. Add a `name` for any condition where Wikidata's is missing or wrong. Then run `npm run catalogue:refresh`, which needs a network connection, and commit the `src/data/conditions.json` it writes.
5. Print a card at 100% and have a native reader check it on paper. Set the script's `verifiedAt7pt` to `true` only after that.

Nothing in the code should name your language. If you find yourself writing `if (lang === 'xx')`, stop and open an issue.

## Adding or correcting a condition

Edit `content/conditions.seed.yaml`, then run `npm run catalogue:refresh`. Suggested DO and DO NOT text must cite at least one public source with a URL and a `reviewedOn` date, and the refresh fails without them. `reviewedBy` must say who has reviewed the text, or that no clinician has. Write each line so it completes its heading. Under DO NOT that means "Give me insulin", never "Do not give me insulin". Keep lines short, as the card is 85 mm wide.

## Correcting an emergency number

Edit `src/data/emergency-numbers.json`, where each country is keyed by its two-letter ISO 3166-1 code. `general` is the one number to call for an ambulance. `ambulance` is a second, ambulance-only number, or `null` when there isn't one. Both are digits only, since the card prints them as they are. Put the official page you checked in `source` and the date in `lastVerified`. A government, regulator, or emergency service page is best. A foreign ministry's travel advice page is fine. The tests reject an entry without a source or a date, a number that isn't digits, and an `ambulance` that repeats `general`.

## Adding a font

The Latin typefaces are the ones in the Look menu, and each also sets Greek and Cyrillic. Put the variable TTF and its licence in a folder under `src/fonts/`, then add an entry under `latin` in `src/fonts/manifest.json` with its family, file, axes, licence, and source. It needs Regular and Bold on the weight axis. A condensed option is the same file with a width set in `axes`, as `plex-condensed` shows. Only fonts under the SIL Open Font License are bundled. Credit the family in NOTICE.md. The tests check that it covers every Latin, Greek, and Cyrillic heading with the Noto Sans fallback.

## Adding a card size

A card size is a format, a plain object in `src/card/formats/`. Start from `id1-landscape.js`, set the size in millimetres, and keep the same named regions, as the renderer places content by those names. Register it in `src/card/formats/index.js`, in `formats` and in `formatNames`, which fills the Size menu. A bigger card should carry bigger type, so give it a `canvas` the way `id2-landscape.js` does. Add a render test to `tests/render.test.js`.

## Code

- JavaScript only. No TypeScript and no UI framework.
- Everything the renderer needs lives under `src/card/` and knows nothing about the DOM.
- Tokens live in `src/card/tokens.js`. Don't hardcode a colour, size, or spacing anywhere else.
- Run `npm run check` before opening a pull request. Add a test when you change the renderer or the text pipeline.
- When you change behaviour, change `AGENTS.md` and any other document that describes it in the same pull request. The pre-commit hook and CI run `npm run docs:check`, which catches the drift it can see.
- Write copy the way GOV.UK does. Short sentences, "you", one instruction per sentence, and no jokes.

## What won't be merged

- Anything that sends data anywhere, including analytics.
- Anything that generates or rewords medical content at run time.
- Anything that shrinks text to fit.
- Adverts, payments, or accounts.
