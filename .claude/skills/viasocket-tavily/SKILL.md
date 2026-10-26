# Tavily (`tavily`)

> Part of viaSocket. Start at the skill, https://flow.viasocket.com/documentation/skill.md.

- slug: `tavily`: name the app by it in code; `viasocket.catalog.serviceIdFor('tavily')` gives the `service_id` the calls take
- sign-in: Basic — the user connects through the Connect popup
- icon, for the Connect button and lists: https://stuff.thingsofbrand.com/tavily.com/images/img8_tavily.png
- 1 actions, 0 triggers

Pick the event the task needs, then read its page, `https://flow.viasocket.com/documentation/tavily/<event>.md`: its ids, its
`inputData` as a TypeScript type. To list only events whose name or description has every word, open
`https://flow.viasocket.com/documentation/tavily.md` with `?search=<words>` added.

## Actions

| event | name | what it does |
| --- | --- | --- |
| `search-the-web` | Search the web | Search the web and return answers using Tavily. |

## Triggers

_None._

