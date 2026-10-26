// Markdown report → readable plain text for "Create Document From Text" (which inserts text as-is).
export function markdownToText(md) {
  const out = []
  for (const raw of String(md || '').split('\n')) {
    let line = raw.trimEnd()
    if (/^\s*\|[\s:|-]+\|\s*$/.test(line)) continue // table divider
    if (/^\s*\|.*\|\s*$/.test(line)) line = line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()).join('  |  ')
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) { out.push('', h[2].toUpperCase() === h[2] ? h[2] : h[2], ''); continue }
    line = line.replace(/^\s*[-*]\s+/, '• ').replace(/^\s*>\s?/, '')
    line = line.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1 ($2)').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/(?<![\w*])_([^_]+)_(?![\w*])/g, '$1').replace(/`([^`]+)`/g, '$1')
    out.push(line)
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
