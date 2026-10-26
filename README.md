# Partnership Deck Manager

Application name in, shareable link to an animated 5-slide viaSocket partnership deck out (the design of `viaSocket_x_AiSensy_final`).

`POST /api/partner-deck {name, domain?, color?, context?}` → `{status:'ready', url, sources}` or `{status:'needs_input', missing}`. Decks are served at `/p/:id`; AiSensy has a fixed link, `/p/aisensy`.

What it does for a partner:
1. Finds the site (given, or name.com/.ai/.io/.in/.co) and crawls the homepage plus up to 8 relevant pages (product, integrations, use cases, pricing…) from its links and sitemap.
2. Finds the logo (site icons, then viaSocket's catalog icon) and the brand colour (theme-color, then the logo's main colour).
3. Sends the crawled text and the apps the site mentions to viaSocket's AI, which writes the slide content in the AiSensy deck's shape. If that fails, a generic template is used and the response says so (`sources.aiTailored: false`).
4. Asks for anything it cannot find (logo, colour, or a description when the site has no readable text).

Run: `npm install && npm start` (needs `VIASOCKET_ORG_ID`, `VIASOCKET_PROJECT_ID`, `VIASOCKET_EMBED_SECRET`). Deployed on Embarko as `partnership-deck-manager`.
