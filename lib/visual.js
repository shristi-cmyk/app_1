// Structured data for the product-map visual, built from the finished report's use-cases table.

const STRENGTHS = { strong: 'Strong', 'worth testing': 'Worth testing', weak: 'Weak' }
const HEX = /^#[0-9a-f]{6}$/i

const clip = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n)

// The "## Use cases" section of the report, up to the next "##" heading.
export function useCasesSection(report) {
  const m = /^##\s+use cases\b.*$/im.exec(report)
  if (!m) return ''
  const rest = report.slice(m.index + m[0].length)
  const next = /^##\s/m.exec(rest)
  return report.slice(m.index, m.index + m[0].length + (next ? next.index : rest.length)).trim()
}

// Cleans what the AI returned: bounded text, known strengths, at most 5 cases, 2-4 apps each.
export function sanitizeVisual(raw, brand = null) {
  const cases = (Array.isArray(raw?.cases) ? raw.cases : []).map((c) => ({
    title: clip(c?.title, 90),
    area: clip(c?.area, 60),
    menu: clip(c?.menu, 18),
    gets: clip(c?.gets, 200),
    apps: (Array.isArray(c?.apps) ? c.apps : []).map((a) => clip(a, 16)).filter(Boolean).slice(0, 4),
    strength: STRENGTHS[String(c?.strength || '').toLowerCase()] || 'Worth testing',
  })).filter((c) => c.title && c.menu && c.apps.length >= 1).slice(0, 5)
  if (!cases.length) return null
  return { app: clip(raw?.app_name, 60), cases, theme: brand && HEX.test(brand) ? { p: brand } : null }
}

// The page's declared theme colour, if it is a usable brand colour (not near white or near black).
export function brandColor(html) {
  const tag = /<meta\b[^>]*name=["']theme-color["'][^>]*>/i.exec(html)?.[0]
  const v = tag && /content=["']\s*(#[0-9a-f]{3}|#[0-9a-f]{6})\s*["']/i.exec(tag)?.[1]
  if (!v) return null
  const hex = v.length === 4 ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` : v
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return lum > 0.88 || lum < 0.1 ? null : hex.toLowerCase()
}
