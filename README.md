# viaSocket Integration Use-Case Research Agent

Enter an application name and URL; the agent follows the viaSocket "Integration Use-Case Research Executive" master prompt (`lib/master-prompt.js`, verbatim) and returns a short, source-backed report: quick summary, use cases, content to create, where to use it, next steps and sources.

Everything runs through viaSocket (the `viasocket-apps` package); there is no separate model key.

- **AI:** `user.ai.send` (model via viaSocket; default `anthropic` / `claude-opus-4-7`), sent with `delivery: "rtlayer"` and the answer read from thread history, so no long HTTP call is held open. Threads belong to one stable owner id (`research-agent-owner`).
- **Evidence the server gathers first:** the application's own pages (`lib/evidence.js`, SSRF-guarded) and viaSocket facts (`lib/viasocket-facts.js`): a live catalog lookup of the target app's actions/triggers and viaSocket's public product docs. The model can also use viaSocket's built-in web reading/search; if that is unavailable (for example the account is out of AI web credits) the report must say so.
- **Other agents:** none can be contacted during a run; the report notes once that other relevant agents will be consulted next.

## Environment variables (set on the host; never commit)

| Name | Value |
| --- | --- |
| `VIASOCKET_ORG_ID`, `VIASOCKET_PROJECT_ID` | from the viaSocket dashboard (Install Code) |
| `VIASOCKET_EMBED_SECRET` | signing secret, server only |
| `RESEARCH_SERVICE`, `RESEARCH_MODEL` | optional model override (see viaSocket's AI doc for names) |
| `RUNS_PER_IP_PER_HOUR`, `MAX_RUNS_PER_DAY`, `MAX_CONCURRENT_RUNS` | optional caps for the public deployment (defaults 3, 100, 2) |

## Run

`npm install && npm run build && npm start` (reads `PORT`). Tests: `npm test`. Nothing is stored on disk; reports are downloadable as Markdown.
