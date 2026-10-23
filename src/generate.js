import { execFile } from 'node:child_process'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { PRESETS, templateBrief, unconfirmedApps } from './briefs.js'
import { buildDeck, iconNeeds } from './deck.js'
import * as icons from './icons.js'
import { draftBrief } from './viasocket.js'

// Memory storage: generated decks live here until the process restarts.
export const decks = new Map()

async function toPdf(pptx) {
  const dir = await mkdtemp(join(tmpdir(), 'deck-'))
  try {
    await writeFile(join(dir, 'deck.pptx'), pptx)
    await new Promise((res, rej) => execFile('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', dir, join(dir, 'deck.pptx')], { timeout: 60000 }, (e) => (e ? rej(e) : res())))
    return await readFile(join(dir, 'deck.pdf'))
  } catch {
    return null // LibreOffice isn't installed everywhere; the .pptx is always produced
  } finally {
    rm(dir, { recursive: true, force: true })
  }
}

/**
 * Build a partner deck. Returns { status: 'needs_icons', missing } when a logo or brand mark can't
 * be found, so the caller asks the user for it instead of shipping a gap; otherwise { status: 'ready', ... }.
 */
export async function generate({ preset, partner, context, useAi = false, uid = 'anonymous' }) {
  let brief
  if (preset) {
    brief = structuredClone(PRESETS[String(preset).toLowerCase()])
    if (!brief) throw new Error(`Unknown preset "${preset}". Known: ${Object.keys(PRESETS).join(', ')}`)
  } else {
    if (!partner?.name) throw new Error('partner.name is required')
    brief = templateBrief(partner)
    if (useAi && context) {
      try {
        const drafted = await draftBrief(uid, brief, context)
        if (drafted && typeof drafted === 'object' && drafted.problem && drafted.flows) brief = { ...drafted, partner: brief.partner }
      } catch (e) {
        console.warn('AI draft failed, using template:', e.message)
      }
    }
  }

  const need = iconNeeds(brief)
  const found = {}
  const missing = []
  for (const { name, domain } of need.logos) {
    const hit = await icons.resolve(name, { domain, kind: 'logo' })
    hit ? (found[name] = hit) : missing.push({ name, kind: 'logo', hint: `a logo URL or image for ${name}` })
  }
  for (const name of need.brands) {
    const hit = await icons.resolve(name, { kind: 'brand' })
    hit ? (found[name] = hit) : missing.push({ name, kind: 'brand mark', hint: `a single-colour icon for ${name}` })
  }
  if (missing.length) return { status: 'needs_icons', missing }

  const pptx = await buildDeck(brief, found)
  const pdf = await toPdf(pptx)
  const id = randomUUID().slice(0, 8)
  const base = `viaSocket_x_${brief.partner.name.replace(/[^A-Za-z0-9]/g, '')}`
  decks.set(id, { base, pptx, pdf })
  return {
    status: 'ready',
    id,
    files: { pptx: `/decks/${id}/${base}.pptx`, ...(pdf && { pdf: `/decks/${id}/${base}.pdf` }) },
    iconSources: Object.fromEntries(Object.entries(found).map(([k, v]) => [k, v.source])),
    reviewBeforeSending: unconfirmedApps(brief).map((a) => `${a} is not confirmed in viaSocket's catalog; swap it or verify first.`)
  }
}
