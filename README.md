# Partnership Deck Manager

**Main flow:** give it an application name, get back a link to an animated 5-slide HTML pitch deck (modelled on `viaSocket_x_AiSensy_v3`): `POST /api/partner-deck {name, domain?, color?, context?}` → `{status:'ready', url}` or `{status:'needs_input', missing}`. Decks are served at `/p/:id`.

It finds the logo (site crawl, then viaSocket's catalog icon), the brand colour (theme-color or the logo's dominant colour), a snapshot of the product UI (headless Chromium, else og:image) and the use case (viaSocket AI reads the site). Anything it can't find is asked for, never guessed. Presenter keys: → / Space next, ← back, N notes, F full screen, `#s1`–`#s5` deep links.


Builds customised viaSocket partner pitch decks (seven slides, `.pptx` plus `.pdf` when LibreOffice is present), following `viasocket_partner_decks_final.md`.

- **Icons:** crawls the partner's site for a logo and uses the open Simple Icons set for brand marks. If it finds nothing it returns `needs_icons` and asks for a URL, never a placeholder.
- **Content:** presets `aisensy` and `bolna`; new partners start from a template and, when a pitch angle is given, the viaSocket AI drafts the brief per run.
- **Delivery:** the user connects an app (Gmail, Slack…) through viaSocket and sends the deck link; the send action is read from the live catalog.
- **Agent-to-agent:** `GET /.well-known/agent.json`, `POST /a2a/tasks`, peers via `PEER_AGENTS` or `POST /a2a/peers`, relay with `POST /a2a/peers/:name/tasks`.
- **Storage:** in memory only. Decks and supplied icons are lost on restart.

Run: `npm install && npm start` (needs the three `VIASOCKET_*` values in `.env`).
