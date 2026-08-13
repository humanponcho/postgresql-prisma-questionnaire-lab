import { useState } from 'react'

/**
 * An interactive connection-routing simulator (the most important production
 * detail). Pick an operation and a connection string; the verdict shows whether
 * that combination is correct, wasteful, or the classic silent failure:
 *
 *                       DATABASE_URL (pooled)     DIRECT_URL (direct)
 *   normal query        ✓ correct                 ⚠ works, wastes a direct conn
 *   schema change (DDL)  ✕ fails silently          ✓ correct
 */
const OPS = [
  { id: 'query', label: 'Normal query', kind: 'SELECT / INSERT / UPDATE — high volume, short-lived' },
  { id: 'ddl', label: 'Schema change (DDL)', kind: 'CREATE TABLE / ALTER TABLE — a migration' },
]
const CONNS = [
  { id: 'pooled', label: 'DATABASE_URL', kind: 'pooled (Neon connection pooler)' },
  { id: 'direct', label: 'DIRECT_URL', kind: 'direct, unpooled' },
]

function verdict(op, conn) {
  if (op === 'query' && conn === 'pooled') return { k: 'ok', head: '✓ CORRECT', t: 'Normal traffic goes through the **pooler**. Many short queries share a small set of Postgres connections, so serverless bursts never exhaust the database.' }
  if (op === 'query' && conn === 'direct') return { k: 'warn', head: '⚠ WORKS, BUT WASTEFUL', t: 'It runs, but a direct connection per invocation is exactly what exhausts the pool under serverless load. Send normal queries through `DATABASE_URL`.' }
  if (op === 'ddl' && conn === 'pooled') return { k: 'bad', head: '✕ FAILS SILENTLY', t: 'DDL through the **pooler** is the classic trap. The migration appears to run but the schema change does not land — a silent failure. This is why `DIRECT_URL` exists.' }
  return { k: 'ok', head: '✓ CORRECT', t: 'Schema changes use the **direct**, unpooled connection (`DIRECT_URL`). DDL must never go through the pooler.' }
}

export default function RoutingLab() {
  const [op, setOp] = useState('query')
  const [conn, setConn] = useState('pooled')
  const v = verdict(op, conn)

  return (
    <div className="pg" style={{ padding: 16 }}>
      <div className="route-groups">
        <div>
          <div className="route-group-label">Operation</div>
          {OPS.map((o) => (
            <button key={o.id} className={`route-opt ${op === o.id ? 'sel' : ''}`} onClick={() => setOp(o.id)}>
              {o.label}<span className="rk">{o.kind}</span>
            </button>
          ))}
        </div>
        <div>
          <div className="route-group-label">Connection string</div>
          {CONNS.map((c) => (
            <button key={c.id} className={`route-opt ${conn === c.id ? 'sel' : ''}`} onClick={() => setConn(c.id)}>
              {c.label}<span className="rk">{c.kind}</span>
            </button>
          ))}
        </div>
      </div>
      <div className={`route-verdict ${v.k}`}>{v.head}</div>
      <div className="route-explain" dangerouslySetInnerHTML={{ __html: inline(v.t) }} />
    </div>
  )
}

function inline(s) {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}
