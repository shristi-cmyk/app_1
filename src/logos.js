import sharp from 'sharp'
import { find } from './catalog.js'

// Real app logos from viaSocket's own app table, shrunk and embedded in the deck so it stays one file.
const cache = new Map()

// Some catalog SVGs are Illustrator exports with non-absolute namespaces (xmlns:x="ns_extend;") that the image library
// refuses to parse; drop the editor metadata and those namespaces, which no drawing uses.
export function cleanSvg(buf) {
  const t = buf.toString('utf8', 0, 4096)
  if (!/<svg[\s>]/i.test(t)) return buf
  return Buffer.from(buf.toString('utf8').replace(/<metadata[\s\S]*?<\/metadata>/gi, '').replace(/\sxmlns:\w+="(?!https?:)[^"]*"/g, ''))
}

async function one(name) {
  if (cache.has(name)) return cache.get(name)
  let uri = null
  try {
    const row = await find(name)
    if (row?.iconUrl) {
      const res = await fetch(row.iconUrl, { signal: AbortSignal.timeout(8000) })
      if (res.ok) {
        const png = await sharp(cleanSvg(Buffer.from(await res.arrayBuffer())), { density: 300 })
          .resize(96, 96, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toBuffer()
        uri = `data:image/png;base64,${png.toString('base64')}`
      }
    }
  } catch { /* no logo: the deck shows the app's first letter */ }
  cache.set(name, uri)
  return uri
}

/** { 'Google Calendar': 'data:image/png;base64,…', … } for the names that have a usable logo. */
export async function fetchLogos(names) {
  const unique = [...new Set(names.filter(Boolean))]
  const out = {}
  await Promise.all(unique.map(async (n) => { const u = await one(n); if (u) out[n] = u }))
  return out
}

/** viaSocket's own logo for an app at slide size, as { data: 'image/png;base64,…', source }, or null. */
export async function catalogLogo(name) {
  try {
    const row = await find(name)
    if (!row?.iconUrl) return null
    const res = await fetch(row.iconUrl, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const png = await sharp(cleanSvg(Buffer.from(await res.arrayBuffer())), { density: 300 }).resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
    return { data: `image/png;base64,${png.toString('base64')}`, source: 'viaSocket catalog' }
  } catch { return null }
}
