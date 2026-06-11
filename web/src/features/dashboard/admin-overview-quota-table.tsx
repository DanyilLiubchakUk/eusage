import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatTimestamp, type QuotaPressureRow } from "./admin-overview-data"

export function QuotaPressureTable({ rows }: { rows: QuotaPressureRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Provider</TableHead>
          <TableHead>Metric</TableHead>
          <TableHead>Usage</TableHead>
          <TableHead>Developer</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="admin-empty-row py-8 text-center text-muted-foreground">
              No quota data yet
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={`${row.providerId}:${row.providerAccountLabel ?? ""}:${row.developerName}:${row.label}`}>
              <TableCell className="align-top">
                <strong className="block">{row.providerName}</strong>
                {row.providerAccountLabel ? (
                  <span className="mt-1 block text-muted-foreground">{row.providerAccountLabel}</span>
                ) : null}
                <span className="mt-1 block text-muted-foreground">{row.status}</span>
              </TableCell>
              <TableCell className="align-top">{row.label}</TableCell>
              <TableCell className="align-top">
                <strong className="block">{Math.round(row.percent)}%</strong>
                <span className="mt-1 block text-muted-foreground">{formatTimestamp(row.updatedAt)}</span>
              </TableCell>
              <TableCell className="align-top">{row.developerName}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
