# Partnership Deck Manager

Application name in, shareable link to an animated 6-slide viaSocket partnership deck out (the design of `viaSocket_x_AiSensy_final`).

`POST /api/partner-deck {name, domain?, color?, context?}` → `{status:'ready', url, sources}` or `{status:'needs_input', missing}`. Decks are served at `/p/:id`; AiSensy has a fixed link, `/p/aisensy`.

What it does for a partner:
1. Finds the site (given, or the one viaSocket's app table lists, or a guess from the name) and crawls the homepage plus up to 8 relevant pages from its links and sitemap.
2. Finds the logo (site icons, then viaSocket's catalog icon) and the brand colour (theme-color, then the logo's main colour).
3. Works out which apps the partner's own pages already name (matched against every app in viaSocket's table). Those are never suggested.
4. Sends the crawled text to viaSocket's AI, which writes the product type, the customer wishes (one app each), the demo and the speaker notes. The app then drops any suggested app that viaSocket doesn't list or the partner already names, tops up from a verified reserve, and fetches each app's real logo from viaSocket's table.
5. Asks for anything it cannot find (logo, colour, presenter, or a description when the site has no readable text), and lists what to confirm before sending (`sources.check`).

Slides: 1 title, 2 "Integration layer for your <product type>" (customer wishes, then the layer diagram), 3 the connect demo and trigger strip, 4 "Keep what you have. Add the rest.", 5 "Live from one prompt", 6 thank-you with the presenter's signature. All wording that is the same for every partner is fixed in code (`fixedWording`), not left to the AI.

Run: `npm install && npm start` (needs `VIASOCKET_ORG_ID`, `VIASOCKET_PROJECT_ID`, `VIASOCKET_EMBED_SECRET`). Deployed on Embarko as `partnership-deck-manager`.
