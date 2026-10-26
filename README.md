# viaSocket Integration Use-Case Research Agent

Enter an application name and URL; the agent researches where viaSocket's integration layer could fit inside that app and returns a short, source-backed report. Prompts live in `lib/prompts.js`.

Everything runs through viaSocket (the `viasocket-apps` package); there is no separate model key.

- **AI:** `user.ai.send` (model via viaSocket; default `anthropic` / `claude-opus-4-7`), sent with `delivery: "rtlayer"` and the answer read from thread history, so no long HTTP call is held open. Threads belong to one stable owner id (`research-agent-owner`).
- **Evidence:** the app's own site and help docs (fetched directly, honest user agent, SSRF-guarded), web search with page text through viaSocket's Tavily app (owner connects it once at `/setup?key=SETUP_KEY`), and a scan for integration platforms in and around the app.
- **Steps:** read reviews, map the integration landscape, then write a short report: snapshot, use cases (where the integration layer fits inside the app), what customers ask for, integration layer already in the app, content ideas, sources.
- **Save as Google Doc:** each visitor connects their own Google account through viaSocket (Connect popup, no Google OAuth code here) and the report is saved as a plain-text Google Doc in their Drive root (`Create Document From Text`). The visitor is identified only by a random httpOnly cookie; the server looks the connection up each time, so nothing is stored. Needs `plug-service.viasocket.com` reachable (slug lookup).
- **Other agents:** none can be contacted during a run; the report notes once that other relevant agents will be consulted next.

## Environment variables (set on the host; never commit)

| Name | Value |
| --- | --- |
| `VIASOCKET_ORG_ID`, `VIASOCKET_PROJECT_ID` | from the viaSocket dashboard (Install Code) |
| `VIASOCKET_EMBED_SECRET` | signing secret, server only |
| `SETUP_KEY` | random string that guards the owner's `/setup` page |
| `RESEARCH_SERVICE`, `RESEARCH_MODEL`, `READER_MODEL` | optional model overrides (see viaSocket's AI doc for names) |
| `RUNS_PER_IP_PER_HOUR`, `MAX_RUNS_PER_DAY`, `MAX_CONCURRENT_RUNS` | optional caps for the public deployment (defaults 3, 100, 2) |

## Run

`npm install && npm run build && npm start` (reads `PORT`). Tests: `npm test`. Nothing is stored on disk; reports are downloadable as Markdown.
