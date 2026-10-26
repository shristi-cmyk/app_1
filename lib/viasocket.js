import { ViaSocket } from 'viasocket-apps'

// Server only. The embed secret never reaches the browser. Built on first use so a missing
// env var fails the request, not the build.
let client
export function getViasocket() {
  client ??= new ViaSocket({
    orgId: process.env.VIASOCKET_ORG_ID,
    projectId: process.env.VIASOCKET_PROJECT_ID,
    secret: process.env.VIASOCKET_EMBED_SECRET,
  })
  return client
}
