// In-memory guard for a public deployment: each run spends the owner's API credits.
// Limits reset on restart; override with env vars.
const num = (v, d) => (Number(v) > 0 ? Number(v) : d)
const PER_IP_PER_HOUR = () => num(process.env.RUNS_PER_IP_PER_HOUR, 3)
const MAX_PER_DAY = () => num(process.env.MAX_RUNS_PER_DAY, 100)
const MAX_CONCURRENT = () => num(process.env.MAX_CONCURRENT_RUNS, 2)

const state = { active: 0, day: '', dayCount: 0, ips: new Map() }

// Returns { ok: true, release } or { ok: false, reason }.
export function acquire(ip, now = Date.now()) {
  const day = new Date(now).toISOString().slice(0, 10)
  if (state.day !== day) { state.day = day; state.dayCount = 0 }
  if (state.dayCount >= MAX_PER_DAY()) return { ok: false, reason: 'Daily research limit reached. Try again tomorrow.' }
  if (state.active >= MAX_CONCURRENT()) return { ok: false, reason: 'The agent is busy with other runs. Try again in a few minutes.' }
  const recent = (state.ips.get(ip) || []).filter((t) => now - t < 3600_000)
  if (recent.length >= PER_IP_PER_HOUR()) return { ok: false, reason: 'Hourly limit reached for your connection. Try again later.' }
  recent.push(now)
  state.ips.set(ip, recent)
  state.dayCount++
  state.active++
  let released = false
  return { ok: true, release: () => { if (!released) { released = true; state.active-- } } }
}

export function resetLimits() { state.active = 0; state.day = ''; state.dayCount = 0; state.ips.clear() }
