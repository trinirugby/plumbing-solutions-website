# Plumbing Solutions Website

Static marketing website for Plumbing Solutions, a full-service residential and commercial
plumbing company in Trinidad & Tobago (est. 1997). Plain HTML/CSS/JS, no framework, deployed
to Netlify.

## Structure

- `index.html`, `services.html`, `products.html`, `about.html`, `career.html`, `tips.html`,
  `gallery.html`, `contact.html`, `404.html`
- `partials/` — shared nav/footer, included client-side via `[data-include]` (see `js/main.js`)
- `assets/images/` — source photography; `assets/optimized/` — generated AVIF/WebP/JPG variants
- `scripts/optimize-images.mjs` — Sharp image pipeline (`npm run optimize`)

## Chatbot

An AI customer-service widget (Claude Haiku 4.5 via the Anthropic SDK) lives in
`netlify/functions/chat.js`, built on a separate `chatbot` branch/worktree after the base site
ships. Requires `ANTHROPIC_API_KEY` set in Netlify site config.

## Local dev

```
npm install
npm run dev       # serve the static site locally
npm run optimize  # regenerate responsive image variants
```
