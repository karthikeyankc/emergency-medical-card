# Security

The site has no backend and no accounts, and nothing a visitor types is sent anywhere. The host, Cloudflare, counts visits the way every web host does. Everything runs in the visitor's browser. The only things it stores are the card, the light or dark theme choice, and any font picked from the visitor's computer, all in the browser's own storage on the visitor's device.

## Reporting a problem

If you find a way the site could leak a visitor's details, load something from another origin, or run code it shouldn't, open a private security advisory on the GitHub repository or email the address on the author's GitHub profile. Please don't open a public issue for a security problem until it's fixed.

## What is in scope

- Any request the built site makes to an origin other than its own.
- Anything that lets an uploaded file (an icon, a font, or a backup) execute code or read data.
- Gaps in the Content Security Policy.

## What the site does to stay safe

- A strict Content Security Policy in production. Scripts, styles, fonts, and connections come from the site's own origin only, with no inline scripts, and WebAssembly is allowed for the text shaper. The policy lives in `src/headers.js`. The page carries it in a meta tag, and the build writes it to `dist/_headers` with `frame-ancestors 'none'` and the other security headers for hosts that read that file.
- Uploaded SVG icons are sanitised. Scripts, external references, and event handlers are removed. An SVG with a picture inside it is turned away, as that picture would skip the size check PNG uploads go through.
- Uploaded icons are drawn as images, so nothing inside them can run.
- Backup files are migrated to the current version. Settings that pick from a list fall back to the default when the value is unknown. A condition icon is rebuilt from the bundled symbol and icon data, or dropped when it doesn't match.
- Fonts from the visitor's computer are read locally and never uploaded.
- The browser smoke test asserts that no request leaves the origin.
