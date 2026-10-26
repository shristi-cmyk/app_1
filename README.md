# Invoice Mailer

When a new row is added to a Google Sheet, a PDF invoice is generated from a Google Docs template and emailed to the buyer with Gmail. Google access goes through viaSocket's embed (no Google OAuth code in this app).

Sheet columns: `buyer_email`, `buyer_name`, `invoice_no`, `amount`, `date`.
Template placeholders: `{{buyer_email}}`, `{{buyer_name}}`, `{{invoice_no}}`, `{{amount}}`, `{{date}}`.

## Environment variables (set these on the host; never commit them)

| Name | Value |
| --- | --- |
| `VIASOCKET_ORG_ID` | `78481` |
| `VIASOCKET_PROJECT_ID` | `proj0VVTCTTP` |
| `VIASOCKET_API_URL` | `https://flow-api.viasocket.com` |
| `VIASOCKET_EMBED_SECRET` | from the viaSocket dashboard (Install Code). Server only. |
| `APP_PASSWORD` | password for the browser login prompt (choose one) |
| `DATA_DIR` | optional; folder for the small state file (use persistent storage) |

## Run

`npm install && npm run build && npm start` (reads `PORT`). Tests: `npm test`.

## Notes
- State (connections and the active subscription) is a JSON file in `DATA_DIR`. On a host with ephemeral disk it resets on redeploy; reconnect and save again, or mount a volume.
- The row handler runs on viaSocket, so new rows are processed even if this app is asleep.

## Research agent (`/research`)

Enter an application name and URL (plus optional context). The agent runs the master prompt in `lib/master-prompt.md` through viaSocket's Run AI Model and saves the report. Connect Slack inside the page, pick a channel from the list, and post any report there.
