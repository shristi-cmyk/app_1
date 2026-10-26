# viaSocket Integration Use-Case Research Agent

Enter an application name and URL; the agent follows the viaSocket "Integration Use-Case Research Executive" master prompt (`lib/master-prompt.js`, verbatim) and returns a source-backed report with the six required sections.

- Research: Claude (`claude-opus-5-5`, adaptive thinking) with web search and web fetch.
- viaSocket verification: read-only tools against viaSocket's public catalog and product docs (`lib/viasocket-tools.js`), so connector coverage and product capabilities are checked, not assumed. No embed secret or user connections are involved.
- HQ agents: no communication tool exists here; the report says internal input was unavailable.

## Environment variables (set on the host; never commit)

| Name | Value |
| --- | --- |
| `ANTHROPIC_API_KEY` | Anthropic API key. Server only. |
| `RUNS_PER_IP_PER_HOUR`, `MAX_RUNS_PER_DAY`, `MAX_CONCURRENT_RUNS` | Optional caps for the public deployment (defaults 3, 100, 2). Each run spends API credits. |
| `RESEARCH_MODEL` | Optional model override. |

## Run

`npm install && npm run build && npm start` (reads `PORT`). Tests: `npm test`.

Nothing is stored on disk; reports are downloadable as Markdown.
