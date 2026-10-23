import pptxgen from 'pptxgenjs'

const INK = '0B0B0C'
const W = 'FFFFFF'
const GREY = { 100: 'F4F4F5', 300: 'D4D4D8', 500: '71717A', 700: '3F3F46' }
const FONT = 'Calibri'

const hex = (c) => c.replace('#', '').toUpperCase()
const mix = (c, to, t) => {
  const n = parseInt(hex(c), 16)
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (to - v) * t))
  return ch.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()
}

/** Every icon a brief needs: the partner logo, viaSocket's logo, and brand marks for flow nodes. */
export function iconNeeds(brief) {
  const brands = new Set()
  for (const f of brief.flows.items) for (const [, , icon] of f.steps) if (icon && icon !== 'partner' && icon !== 'viasocket') brands.add(icon)
  return { logos: [{ name: brief.partner.name, domain: brief.partner.domain }, { name: 'viaSocket', domain: 'viasocket.com' }], brands: [...brands] }
}

export async function buildDeck(brief, icons) {
  const S = hex(brief.partner.color)
  const S_DARK = mix(S, 0, 0.55)
  const S_TINT = mix(S, 255, 0.9)
  const p = brief.partner.name
  const pres = new pptxgen()
  pres.layout = 'LAYOUT_16x9'
  pres.title = `viaSocket × ${p}`
  const R = pres.ShapeType.roundRect

  const img = (slide, name, x, y, w, h) => {
    const data = icons[name]?.data
    if (data) slide.addImage({ data, x, y, w, h })
    return !!data
  }
  const text = (slide, t, o) => slide.addText(t, { fontFace: FONT, margin: 0, valign: 'top', ...o })
  const title = (slide, t, color = INK) => text(slide, t, { x: 0.5, y: 0.35, w: 9, h: 0.75, fontSize: 34, bold: true, color, valign: 'middle' })
  const chip = (slide, t, x, y, o = {}) => {
    const w = o.w ?? 0.25 + t.length * 0.095
    slide.addShape(R, { x, y, w, h: 0.34, rectRadius: 0.17, fill: { color: o.fill ?? GREY[100] }, line: { color: o.line ?? o.fill ?? GREY[300], width: 1 } })
    text(slide, t, { x, y, w, h: 0.34, fontSize: 12, color: o.color ?? INK, align: 'center', valign: 'middle' })
    return x + w + 0.12
  }
  const wordmark = (slide, x, y, w, h, color) => text(slide, 'viaSocket', { x, y, w, h, fontSize: 18, bold: true, color, valign: 'middle', align: 'center' })

  // 1. Title
  {
    const s = pres.addSlide()
    s.background = { color: INK }
    s.addShape(R, { x: 0.5, y: 0.5, w: 1.1, h: 0.6, rectRadius: 0.1, fill: { color: W } })
    if (!img(s, p, 0.6, 0.55, 0.9, 0.5)) text(s, p, { x: 0.5, y: 0.5, w: 1.1, h: 0.6, fontSize: 14, bold: true, color: INK, align: 'center', valign: 'middle' })
    s.addShape(pres.ShapeType.line, { x: 1.75, y: 0.8, w: 0.9, h: 0, line: { color: S, width: 2, dashType: 'dash' } })
    s.addShape(R, { x: 2.8, y: 0.5, w: 1.5, h: 0.6, rectRadius: 0.1, fill: { color: INK }, line: { color: GREY[700], width: 1 } })
    if (!img(s, 'viaSocket', 2.9, 0.55, 1.3, 0.5)) wordmark(s, 2.8, 0.5, 1.5, 0.6, W)
    text(s, brief.title, { x: 0.5, y: 1.6, w: 8.6, h: 1.5, fontSize: 34, bold: true, color: W })
    text(s, brief.subtitle, { x: 0.5, y: 3.15, w: 8, h: 0.8, fontSize: 14, color: GREY[300] })
    let cx = 0.5
    for (const c of brief.chips) cx = chip(s, c, cx, 4.15, { fill: INK, line: S, color: S })
    text(s, `viaSocket × ${p} · Partnership proposal`, { x: 0.5, y: 5.05, w: 9, h: 0.3, fontSize: 12, color: GREY[500] })
    s.addNotes(brief.titleNotes)
  }

  // 2. Problem
  {
    const s = pres.addSlide()
    s.background = { color: W }
    const pr = brief.problem
    title(s, pr.title)
    text(s, pr.asksHeading, { x: 0.5, y: 1.3, w: 4.6, h: 0.3, fontSize: 14, bold: true, color: S_DARK })
    pr.asks.forEach(([q, needs], i) => {
      const y = 1.7 + i * 0.85
      s.addShape(R, { x: 0.5, y, w: 4.6, h: 0.72, rectRadius: 0.08, fill: { color: S_TINT }, line: { color: S, width: 1 } })
      text(s, q, { x: 0.65, y: y + 0.06, w: 4.3, h: 0.3, fontSize: 13, bold: true, color: INK })
      text(s, `→ needs ${needs}`, { x: 0.65, y: y + 0.38, w: 4.3, h: 0.28, fontSize: 12, color: GREY[700] })
    })
    s.addShape(R, { x: 5.4, y: 1.3, w: 4.1, h: 3.8, rectRadius: 0.1, fill: { color: GREY[100] }, line: { color: GREY[300], width: 1 } })
    text(s, pr.pathHeading, { x: 5.6, y: 1.45, w: 3.7, h: 0.3, fontSize: 14, bold: true, color: INK })
    text(s, pr.path, { x: 5.6, y: 1.85, w: 3.7, h: 0.7, fontSize: 13, color: GREY[700], italic: true })
    text(s, pr.pains.map((t) => ({ text: t, options: { bullet: true, breakLine: true } })), { x: 5.6, y: 2.7, w: 3.7, h: 2.2, fontSize: 13, color: INK, paraSpaceAfter: 6 })
    s.addNotes(pr.notes)
  }

  // 3. Your UI. viaSocket's engine.
  {
    const s = pres.addSlide()
    s.background = { color: W }
    const m = brief.mock
    title(s, "Your UI. viaSocket's engine.")
    s.addShape(R, { x: 0.5, y: 1.3, w: 5.4, h: 3.8, rectRadius: 0.1, fill: { color: W }, line: { color: GREY[300], width: 1.5 } })
    if (m.type === 'chat') {
      text(s, m.title, { x: 0.7, y: 1.42, w: 2, h: 0.3, fontSize: 12, bold: true, color: S_DARK })
      m.steps.forEach((t, i) => chip(s, t, 2.6 + i * 0.82, 1.42, { w: 0.74, fill: i === 0 ? S : GREY[100], color: i === 0 ? W : GREY[700] }))
      text(s, m.headline, { x: 0.7, y: 1.95, w: 5, h: 0.4, fontSize: 16, bold: true, color: INK })
      s.addShape(R, { x: 2.2, y: 2.5, w: 3.5, h: 0.6, rectRadius: 0.1, fill: { color: S_TINT }, line: { color: S, width: 1 } })
      text(s, m.user, { x: 2.3, y: 2.5, w: 3.3, h: 0.6, fontSize: 12, color: INK, valign: 'middle' })
      s.addShape(R, { x: 0.7, y: 3.25, w: 4.2, h: 0.85, rectRadius: 0.1, fill: { color: GREY[100] }, line: { color: GREY[300], width: 1 } })
      text(s, m.agent, { x: 0.8, y: 3.25, w: 4, h: 0.85, fontSize: 12, color: INK, valign: 'middle' })
      s.addShape(R, { x: 0.7, y: 4.3, w: 1.9, h: 0.5, rectRadius: 0.08, fill: { color: S } })
      text(s, m.button, { x: 0.7, y: 4.3, w: 1.9, h: 0.5, fontSize: 13, bold: true, color: W, align: 'center', valign: 'middle' })
      text(s, m.buttonNote, { x: 2.75, y: 4.3, w: 3, h: 0.5, fontSize: 12, color: GREY[500], valign: 'middle' })
    } else {
      text(s, m.title, { x: 0.7, y: 1.42, w: 3, h: 0.4, fontSize: 18, bold: true, color: INK })
      if (m.badge) chip(s, m.badge, 2.1, 1.47, { w: 0.6, fill: S, color: W })
      text(s, m.headline, { x: 0.7, y: 1.85, w: 5, h: 0.45, fontSize: 12, color: GREY[700] })
      m.tiles.forEach(([n, st], i) => {
        const x = 0.7 + i * 1.28
        s.addShape(R, { x, y: 2.4, w: 1.18, h: 0.8, rectRadius: 0.08, fill: { color: W }, line: { color: st === 'Connected' ? S : GREY[300], width: 1 } })
        text(s, n, { x, y: 2.47, w: 1.18, h: 0.3, fontSize: 12, bold: true, color: INK, align: 'center' })
        text(s, st, { x, y: 2.8, w: 1.18, h: 0.3, fontSize: 12, color: st === 'Connected' ? S_DARK : GREY[500], align: 'center' })
      })
      s.addShape(R, { x: 0.7, y: 3.4, w: 5, h: 1.55, rectRadius: 0.08, fill: { color: S_TINT }, line: { color: S, width: 1 } })
      text(s, m.toolsHeading, { x: 0.85, y: 3.48, w: 4.7, h: 0.3, fontSize: 12, bold: true, color: S_DARK })
      m.tools.forEach(([t, on], i) => text(s, `${on ? '✓' : '○'} ${t}${on ? '' : ' (off)'}`, { x: 0.85, y: 3.78 + i * 0.27, w: 4.7, h: 0.27, fontSize: 12, color: on ? INK : GREY[500] }))
      text(s, m.toolsNote, { x: 0.85, y: 4.62, w: 4.7, h: 0.28, fontSize: 12, italic: true, color: GREY[700] })
    }
    s.addShape(R, { x: 6.15, y: 1.3, w: 3.35, h: 3.8, rectRadius: 0.1, fill: { color: INK } })
    text(s, 'Powered by viaSocket', { x: 6.35, y: 1.45, w: 3, h: 0.35, fontSize: 16, bold: true, color: W })
    text(s, `(invisible to your customers)`, { x: 6.35, y: 1.8, w: 3, h: 0.3, fontSize: 12, color: GREY[500] })
    text(s, m.powered.map((t) => ({ text: t, options: { bullet: true, breakLine: true } })), { x: 6.35, y: 2.3, w: 3, h: 2.6, fontSize: 13, color: W, paraSpaceAfter: 8 })
    s.addNotes(m.notes)
  }

  // 4. Flows
  {
    const s = pres.addSlide()
    s.background = { color: W }
    title(s, brief.flows.title)
    brief.flows.items.forEach((f, row) => {
      const y0 = 1.3 + row * 2
      text(s, f.heading, { x: 0.5, y: y0, w: 9, h: 0.3, fontSize: 14, bold: true, color: S_DARK })
      f.steps.forEach(([label, sub, icon], i) => {
        const x = 0.5 + i * 2.35
        const isVia = icon === 'viasocket'
        const isPartner = icon === 'partner'
        s.addShape(R, { x, y: y0 + 0.45, w: 2.0, h: 1.3, rectRadius: 0.1, fill: { color: isVia ? INK : isPartner ? S_TINT : GREY[100] }, line: { color: isVia ? INK : isPartner ? S : GREY[300], width: 1 } })
        // brand mark on a dark circle; partner and viaSocket use their logos
        s.addShape(pres.ShapeType.ellipse, { x: x + 0.78, y: y0 + 0.52, w: 0.44, h: 0.44, fill: { color: isPartner ? S : INK } })
        const iconKey = isVia ? 'viaSocket' : isPartner ? p : icon
        if (iconKey) img(s, iconKey, x + 0.84, y0 + 0.58, 0.32, 0.32)
        text(s, label, { x, y: y0 + 1.0, w: 2.0, h: 0.3, fontSize: 13, bold: true, color: isVia ? W : INK, align: 'center' })
        text(s, sub, { x, y: y0 + 1.3, w: 2.0, h: 0.3, fontSize: 12, color: isVia ? GREY[300] : GREY[700], align: 'center' })
        if (i < f.steps.length - 1) text(s, '→', { x: x + 2.0, y: y0 + 0.9, w: 0.35, h: 0.4, fontSize: 18, bold: true, color: S, align: 'center' })
      })
    })
    s.addNotes(brief.flows.notes)
  }

  // 5. Objections
  {
    const s = pres.addSlide()
    s.background = { color: W }
    title(s, brief.objections.title)
    brief.objections.items.forEach((o, i) => {
      const x = 0.5 + i * 4.6
      s.addShape(R, { x, y: 1.3, w: 4.4, h: 3.1, rectRadius: 0.1, fill: { color: W }, line: { color: GREY[300], width: 1.5 } })
      s.addShape(R, { x: x + 0.15, y: 1.45, w: 4.1, h: 0.7, rectRadius: 0.08, fill: { color: S_TINT } })
      text(s, o.quote, { x: x + 0.25, y: 1.45, w: 3.9, h: 0.7, fontSize: 13, italic: true, color: S_DARK, valign: 'middle' })
      text(s, o.answer, { x: x + 0.2, y: 2.25, w: 4.0, h: 0.35, fontSize: 15, bold: true, color: INK })
      text(s, o.bullets.map((t) => ({ text: t, options: { bullet: true, breakLine: true } })), { x: x + 0.2, y: 2.65, w: 4.0, h: 1.0, fontSize: 12, color: GREY[700], paraSpaceAfter: 4 })
      let cx = x + 0.2
      let cy = 3.7
      for (const c of o.chips) {
        const w = 0.25 + c.length * 0.095
        if (cx + w > x + 4.3) { cx = x + 0.2; cy += 0.4 }
        cx = chip(s, c, cx, cy, { fill: INK, line: INK, color: W })
      }
    })
    s.addShape(R, { x: 0.5, y: 4.6, w: 9, h: 0.55, rectRadius: 0.1, fill: { color: S } })
    text(s, brief.objections.banner, { x: 0.5, y: 4.6, w: 9, h: 0.55, fontSize: 16, bold: true, color: W, align: 'center', valign: 'middle' })
    s.addNotes(brief.objections.notes)
  }

  // 6. Gains
  {
    const s = pres.addSlide()
    s.background = { color: W }
    title(s, brief.gains.title)
    brief.gains.items.forEach(([h, b], i) => {
      const x = 0.5 + (i % 2) * 4.6
      const y = 1.35 + Math.floor(i / 2) * 1.9
      s.addShape(R, { x, y, w: 4.4, h: 1.7, rectRadius: 0.1, fill: { color: S_TINT }, line: { color: S, width: 1 } })
      s.addShape(pres.ShapeType.rect, { x, y: y + 0.2, w: 0.08, h: 1.3, fill: { color: S } })
      text(s, h, { x: x + 0.3, y: y + 0.2, w: 3.9, h: 0.4, fontSize: 16, bold: true, color: S_DARK })
      text(s, b, { x: x + 0.3, y: y + 0.7, w: 3.9, h: 0.85, fontSize: 13, color: INK })
    })
    s.addNotes(brief.gains.notes)
  }

  // 7. Setup
  {
    const s = pres.addSlide()
    s.background = { color: INK }
    title(s, 'Live in about 15 minutes', W)
    brief.setup.steps.forEach((st, i) => {
      const x = 0.5 + i * 2.3
      s.addShape(R, { x, y: 1.3, w: 2.1, h: 2.3, rectRadius: 0.1, fill: { color: '18181B' }, line: { color: GREY[700], width: 1 } })
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.15, y: 1.45, w: 0.45, h: 0.45, fill: { color: S } })
      text(s, String(i + 1), { x: x + 0.15, y: 1.45, w: 0.45, h: 0.45, fontSize: 14, bold: true, color: W, align: 'center', valign: 'middle' })
      text(s, st.h, { x: x + 0.15, y: 2.0, w: 1.8, h: 0.35, fontSize: 14, bold: true, color: W })
      text(s, st.b, { x: x + 0.15, y: 2.4, w: 1.8, h: 1.15, fontSize: 12, color: GREY[300] })
    })
    text(s, brief.setup.after, { x: 0.5, y: 3.75, w: 9, h: 0.3, fontSize: 14, bold: true, color: S })
    text(s, 'Suggested starting apps', { x: 0.5, y: 4.15, w: 3, h: 0.3, fontSize: 12, color: GREY[500] })
    let cx = 0.5
    let cy = 4.5
    for (const a of brief.setup.apps) {
      if (cx + 0.25 + a.length * 0.095 > 9.5) { cx = 0.5; cy += 0.42 }
      cx = chip(s, a, cx, cy, { fill: INK, line: GREY[500], color: W })
    }
    s.addNotes(brief.setup.notes)
  }

  return pres.write({ outputType: 'nodebuffer' })
}
