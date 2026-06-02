import { formatTimestamp, type QuotaPressureRow } from "./admin-overview-data"

export function QuotaPressureTable({ rows }: { rows: QuotaPressureRow[] }) {
  return (
    <table className="admin-compact-table">
      <thead>
        <tr>
          <th>Provider</th>
          <th>Metric</th>
          <th>Usage</th>
          <th>Developer</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={4} className="admin-empty-row">
              No quota data yet
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={`${row.providerId}:${row.developerName}:${row.label}`}>
              <td>
                <strong>{row.providerName}</strong>
                <span>{row.status}</span>
              </td>
              <td>{row.label}</td>
              <td>
                <strong>{Math.round(row.percent)}%</strong>
                <span>{formatTimestamp(row.updatedAt)}</span>
              </td>
              <td>{row.developerName}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}
