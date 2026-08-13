import { md } from './Blocks.jsx'

/**
 * A simple data table. Cells support the same inline `code` / **bold** markdown
 * as the prose blocks.
 */
export default function Table({ head = [], rows = [] }) {
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        {head.length > 0 && (
          <thead>
            <tr>{head.map((h, i) => <th key={i} dangerouslySetInnerHTML={{ __html: md(h) }} />)}</tr>
          </thead>
        )}
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => <td key={j} dangerouslySetInnerHTML={{ __html: md(String(c)) }} />)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
