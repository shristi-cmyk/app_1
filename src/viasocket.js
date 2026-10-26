import { ViaSocket, ViaSocketError } from 'viasocket-apps'

const need = (k) => {
  const v = process.env[k]
  if (!v) throw new Error(`${k} is missing from .env`)
  return v
}

let client
export const viasocket = () =>
  (client ??= new ViaSocket({
    orgId: need('VIASOCKET_ORG_ID'),
    projectId: need('VIASOCKET_PROJECT_ID'),
    secret: need('VIASOCKET_EMBED_SECRET')
  }))

export { ViaSocketError }
