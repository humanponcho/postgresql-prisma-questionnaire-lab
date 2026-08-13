import { useState } from 'react'

/**
 * A live schema.prisma analyzer. It parses the schema in your browser (no
 * Prisma CLI) and teaches its structure + the specific traps from the lesson:
 *
 *  - DATASOURCE — is a `directUrl` declared? Without it, DDL migrations run
 *    through the pooler and fail silently.
 *  - GENERATOR  — does `binaryTargets` cover every deploy platform? "native"
 *    alone crashes on Vercel serverless / Alpine / ARM.
 *  - MODELS     — table name (@@map), primary key, unique business-rule
 *    constraints (the P2002 pattern), and relations.
 *
 * Edit the schema and press ▶ Validate.
 */
export default function SchemaLab({ name = 'schema.prisma', initial = '', height = 300 }) {
  const [code, setCode] = useState(initial)
  const [result, setResult] = useState(null)

  function validate() {
    try { setResult(analyze(code)) }
    catch (e) { setResult({ error: e.message }) }
  }

  return (
    <div className="pg">
      <div className="pg-bar">
        <div className="pg-dots"><span className="pg-dot r" /><span className="pg-dot y" /><span className="pg-dot g" /></div>
        <span className="pg-name">{name}</span>
        <div className="pg-actions">
          <button className="btn" onClick={() => { setCode(initial); setResult(null) }}>Reset</button>
          <button className="btn run" onClick={validate}>▶ Validate</button>
        </div>
      </div>
      <textarea
        className="pg-editor"
        style={{ minHeight: height }}
        spellCheck={false}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={handleTab}
      />
      {result && result.error && (
        <>
          <div className="pg-out-label">Error</div>
          <div className="pg-out"><span className="log-err">✕ {result.error}</span></div>
        </>
      )}
      {result && !result.error && (
        <>
          <div className="pg-out-label">Datasource &amp; generator</div>
          <div className="pg-out">
            <div>provider: <span className="log-info">{result.ds.provider || '—'}</span></div>
            <div>url (pooled): <span className="log-info">{result.ds.url || '—'}</span></div>
            <div>directUrl: {result.ds.directUrl
              ? <span className="log-ok">{result.ds.directUrl}</span>
              : <span className="log-err">MISSING</span>}</div>
            <div>binaryTargets: {result.gen.targets.length
              ? <span className={result.gen.targets.length > 1 ? 'log-ok' : 'log-warn'}>{result.gen.targets.join(', ')}</span>
              : <span className="log-warn">(none)</span>}</div>
          </div>
          <div className="pg-out-label">Models ({result.models.length})</div>
          <div className="pg-out">
            {result.models.length === 0
              ? <span className="log-muted">(no models found)</span>
              : result.models.map((m, i) => (
                  <div className="model-row" key={i}>
                    <span className="model-name">{m.name}</span>
                    <span className="model-map">{m.table}</span>
                    <span className="model-badges">
                      <span className="mb pk">{m.pk ? `pk ${m.pk}` : 'no pk'}</span>
                      {m.unique.length > 0 && <span className="mb uniq">unique: {m.unique.join(', ')}</span>}
                      {m.relations > 0 && <span className="mb rel">{m.relations} relation{m.relations > 1 ? 's' : ''}</span>}
                    </span>
                    <div className="model-meta">{m.fields} fields</div>
                  </div>
                ))}
          </div>
          <div className="pg-out-label">Checks</div>
          <div className="pg-out">
            {result.checks.map((c, i) => (
              <div className={`check-row ${c.k}`} key={i}>
                <span className="ico">{ICON[c.k]}</span>
                <span dangerouslySetInnerHTML={{ __html: inline(c.t) }} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const ICON = { ok: '✓', warn: '⚠', err: '✕', note: 'ℹ' }
const SCALARS = new Set(['String', 'Int', 'BigInt', 'Float', 'Decimal', 'Boolean', 'DateTime', 'Json', 'Bytes'])
const MONEY = /price|amount|total|cost|rate|fee|balance|subtotal|shipping|refund/i

function analyze(code) {
  const blocks = parseBlocks(code)
  const dsBlock = blocks.find((b) => b.kind === 'datasource')
  const genBlock = blocks.find((b) => b.kind === 'generator')
  const modelBlocks = blocks.filter((b) => b.kind === 'model')
  const modelNames = new Set(modelBlocks.map((b) => b.name))

  // Datasource.
  const ds = { provider: null, url: null, directUrl: null }
  if (dsBlock) {
    for (const l of dsBlock.body) {
      if (/^provider\s*=/.test(l)) ds.provider = strval(l)
      else if (/^url\s*=/.test(l)) ds.url = envName(l)
      else if (/^directUrl\s*=/.test(l)) ds.directUrl = envName(l)
    }
  }

  // Generator.
  const gen = { targets: [] }
  if (genBlock) {
    const bt = genBlock.body.find((l) => /^binaryTargets\s*=/.test(l))
    if (bt) gen.targets = (bt.match(/"([^"]+)"/g) || []).map((s) => s.replace(/"/g, ''))
  }

  // Models.
  const money = []
  const uniqueAll = []
  const models = modelBlocks.map((b) => {
    let table = b.name
    const pkFields = []
    const unique = []
    let fields = 0
    let relations = 0
    for (const l of b.body) {
      if (l.startsWith('@@map')) { const v = l.match(/"([^"]+)"/); if (v) table = v[1]; continue }
      if (l.startsWith('@@id')) { const v = l.match(/\[([^\]]+)\]/); if (v) pkFields.push(v[1].trim()); continue }
      if (l.startsWith('@@unique')) { const v = l.match(/\[([^\]]+)\]/); if (v) unique.push(v[1].replace(/\s/g, '')); continue }
      if (l.startsWith('@@')) continue
      const fm = l.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)(\[\])?(\?)?(.*)$/)
      if (!fm) continue
      const [, fname, ftype, list, , attrs] = fm
      fields++
      const isRel = /@relation/.test(attrs) || (!SCALARS.has(ftype) && (modelNames.has(ftype) || /^[A-Z]/.test(ftype)))
      if (isRel) { relations++; continue }
      if (/@id\b/.test(attrs)) pkFields.push(fname)
      if (/@unique\b/.test(attrs)) { unique.push(fname); uniqueAll.push(`${b.name}.${fname}`) }
      if (ftype === 'Float' && MONEY.test(fname)) money.push(`${b.name}.${fname}`)
    }
    return { name: b.name, table, pk: pkFields.join('+') || null, unique, relations, fields }
  })

  // ---- checks ----
  const checks = []
  if (dsBlock && !ds.directUrl) {
    checks.push({ k: 'warn', t: 'No `directUrl` in the datasource. Schema changes (DDL) would run through the pooled `url` and **fail silently**. Add `directUrl = env("DIRECT_URL")`.' })
  } else if (dsBlock && ds.directUrl) {
    checks.push({ k: 'ok', t: `\`directUrl\` is set (\`${ds.directUrl}\`) — DDL migrations use the unpooled connection. Good.` })
  }

  if (genBlock) {
    if (gen.targets.length <= 1) {
      checks.push({ k: 'warn', t: '`binaryTargets` is `native`-only (or empty). The generated client will crash on any other platform (Vercel serverless, Alpine/ARM Docker). List every target you deploy to.' })
    } else {
      checks.push({ k: 'ok', t: `\`binaryTargets\` covers ${gen.targets.length} platforms — the client runs everywhere you deploy.` })
    }
  }

  const noPk = models.filter((m) => !m.pk)
  if (noPk.length) checks.push({ k: 'err', t: `No primary key on: **${noPk.map((m) => m.name).join(', ')}**. Add \`@id\`.` })

  const noMap = models.filter((m) => m.table === m.name)
  if (noMap.length) checks.push({ k: 'note', t: `No \`@@map\` on: **${noMap.map((m) => m.name).join(', ')}**. Without it the table keeps the model's name instead of a snake_case name.` })

  if (uniqueAll.length) checks.push({ k: 'note', t: `Business rules enforced by unique constraints (the P2002 pattern): ${uniqueAll.map((u) => `\`${u}\``).join(', ')}.` })

  if (money.length) checks.push({ k: 'note', t: `Money stored as \`Float\`: ${money.map((m) => `\`${m}\``).join(', ')}. Deliberate trade-off (ADR-001), but floats can drift — worth a comment.` })

  if (checks.length === 0) checks.push({ k: 'ok', t: 'No issues detected.' })
  return { ds, gen, models, checks }
}

function parseBlocks(code) {
  const blocks = []
  let cur = null
  for (const raw of code.replace(/\r/g, '').split('\n')) {
    const line = raw.replace(/\/\/.*$/, '').trim()
    if (!cur) {
      const m = line.match(/^(generator|datasource|model|enum)\s+([A-Za-z0-9_]+)\s*\{?/)
      if (m) cur = { kind: m[1], name: m[2], body: [] }
    } else if (line.startsWith('}')) {
      blocks.push(cur); cur = null
    } else if (line) {
      cur.body.push(line)
    }
  }
  if (cur) blocks.push(cur)
  return blocks
}

function strval(l) { const m = l.match(/"([^"]+)"/); return m ? m[1] : null }
function envName(l) { const m = l.match(/env\(\s*"([^"]+)"\s*\)/); return m ? m[1] : (strval(l) || 'set') }

function handleTab(e) {
  if (e.key === 'Tab') {
    e.preventDefault()
    const el = e.target
    const s = el.selectionStart, en = el.selectionEnd
    el.value = el.value.slice(0, s) + '  ' + el.value.slice(en)
    el.selectionStart = el.selectionEnd = s + 2
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

function inline(s) {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}
