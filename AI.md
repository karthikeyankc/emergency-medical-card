# AI usage disclosure

Emergency Medical Card is built with AI tools. This file says how and where. People carry this card into an emergency, so you should know which parts a person with the right expertise has checked, and which parts nobody has yet.

## Tools used

- **Claude** (Anthropic)
- **Gemini** (Google)

## What AI contributed

- **The code.** The renderer and text pipeline, the editor, the exports, the build scripts, and the tests.
- **The words.** The copy on the site and the documentation, edited to my voice.
- **The card headings in every language except English.** They were translated with AI. No native speaker has checked any of them yet, and the editor says so when you pick one.
- **The suggested DO and DO NOT text** for 20 conditions. It was drafted with AI from the NHS and charity pages cited beside each suggestion. No clinician has reviewed it yet, and the editor says so beside the text.
- **The emergency number table.** AI agents checked each country's numbers against a government, regulator, or emergency service page, or a foreign ministry's travel advice. Each entry records that page as its `source`, with the date it was checked.

## What a human checked

I directed the work and reviewed it as it went. Every change passes the automated checks before it's committed. That covers the unit tests, a browser test that exports every format and asserts nothing leaves the page, a layout test at seven screen sizes, an accessibility audit, and a check that the documents still match the code.

These haven't been checked by someone with the right expertise yet.

- **The translated headings.** Each needs a native speaker. [Help check yours](README.md#check-the-headings-in-your-language).
- **The suggested first aid text.** It needs a clinician.
- **The emergency numbers.** I haven't checked every one against its source myself.
- **A printed card in a script other than Latin.** It needs a native reader.

## Why disclose this

If you're relying on a card made here, or thinking of using the code, you should know how it was made. Check everything on your card with your doctor before you print it. The code is released under the MIT licence, so read it, audit it, and judge it on its merits.
