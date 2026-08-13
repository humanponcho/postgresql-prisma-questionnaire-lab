/**
 * Read-only code panel for showing schema.prisma, SQL, JS, and shell snippets
 * that are illustrative (not meant to be analyzed). Comments and a few keywords
 * are lightly highlighted. Use the interactive playgrounds (Terminal / SchemaLab
 * / RoutingLab) when the point is to *run* something.
 */
const PRISMA_KW = new Set([
  'generator', 'datasource', 'model', 'enum', 'provider', 'url', 'directUrl',
  'binaryTargets', 'output', 'relationMode',
])
const SQL_KW = new Set([
  'CREATE', 'ALTER', 'DROP', 'TABLE', 'SELECT', 'INSERT', 'UPDATE', 'DELETE',
  'BEGIN', 'COMMIT', 'ROLLBACK', 'CONSTRAINT', 'UNIQUE', 'INDEX', 'REFERENCES',
])

export default function CodeBlock({ name = 'snippet', lang = '', code = '' }) {
  const html = highlight(code, lang)
  return (
    <div className="code-static">
      <div className="pg-bar">
        <div className="pg-dots"><span className="pg-dot r" /><span className="pg-dot y" /><span className="pg-dot g" /></div>
        <span className="pg-name">{name}</span>
        {lang && <span className="pg-name" style={{ marginLeft: 'auto', textTransform: 'uppercase', fontSize: 10, letterSpacing: '.08em' }}>{lang}</span>}
      </div>
      <pre dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlight(code, lang) {
  return code.split('\n').map((line) => {
    const trimmed = line.trimStart()
    if (trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('--')) {
      return `<span class="cmt">${esc(line)}</span>`
    }
    let safe = esc(line)
    if (lang === 'prisma') {
      const m = safe.match(/^(\s*)([A-Za-z_]+)\b/)
      if (m && PRISMA_KW.has(m[2])) safe = safe.replace(m[2], `<span class="kw">${m[2]}</span>`)
    } else if (lang === 'sql') {
      safe = safe.replace(/\b([A-Z]{2,})\b/g, (w) => (SQL_KW.has(w) ? `<span class="kw">${w}</span>` : w))
    }
    return safe
  }).join('\n')
}
