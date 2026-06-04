import { useState } from "react"
import { DatabaseZap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatCount } from "./dashboard-formatting"

export function SeedMockDataPanel({
  onSeedMockData,
}: {
  onSeedMockData?: () => Promise<{ seeded: Record<string, number> }> | void
}) {
  const [status, setStatus] = useState<string | null>(null)
  const [isSeeding, setIsSeeding] = useState(false)

  async function handleClick() {
    if (!onSeedMockData || isSeeding) return

    setIsSeeding(true)
    setStatus(null)
    try {
      const result = await onSeedMockData()
      const total = Object.values(result?.seeded ?? {}).reduce((sum, count) => sum + count, 0)
      setStatus(`Seeded ${formatCount(total)} rows.`)
    } catch (error) {
      console.error(error)
      setStatus("Seed failed.")
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div className="grid gap-3">
      <p className="m-0 text-sm text-muted-foreground">
        Replaces prior local seed rows for Cursor, Codex, Claude, and JetBrains.
      </p>
      <Button
        className="w-fit"
        type="button"
        disabled={!onSeedMockData || isSeeding}
        onClick={() => void handleClick()}
      >
        <DatabaseZap aria-hidden="true" />
        {isSeeding ? "Seeding..." : "Seed mock data"}
      </Button>
      {status ? <span className="text-sm text-muted-foreground">{status}</span> : null}
    </div>
  )
}
