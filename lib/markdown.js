// Small, safe Markdown renderer for the report: HTML is escaped first; only http(s) links are linked.
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function inline(raw) {
  let s = esc(raw)
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>')
  return s
}

const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())

export function renderMarkdown(md) {
  const lines = String(md || '').split('\n')
  const out = []
  let list = null
  const close = () => { if (list) { out.push(`</${list}>`); list = null } }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let m
    if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) {
      close()
      const head = cells(line)
      i += 2
      const rows = []
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]))
      i--
      out.push('<table><thead><tr>' + head.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' +
        rows.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table>')
    } else if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      close(); out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`)
    } else if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
      if (list !== 'ul') { close(); out.push('<ul>'); list = 'ul' }
      out.push(`<li>${inline(m[1])}</li>`)
    } else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
      if (list !== 'ol') { close(); out.push('<ol>'); list = 'ol' }
      out.push(`<li>${inline(m[1])}</li>`)
    } else if (/^\s*---+\s*$/.test(line)) {
      close(); out.push('<hr>')
    } else if (line.trim() === '') {
      close()
    } else {
      close(); out.push(`<p>${inline(line)}</p>`)
    }
  }
  close()
  return out.join('\n')
}

// Splits the report right after the "Use cases" section, so a visual can sit between it and the next section.
export function splitAtUseCases(md) {
  const text = String(md || '')
  const m = /^##\s+use cases\b.*$/im.exec(text)
  if (!m) return [text, '']
  const start = m.index + m[0].length
  const next = /^##\s/m.exec(text.slice(start))
  if (!next) return [text, '']
  return [text.slice(0, start + next.index), text.slice(start + next.index)]
}
