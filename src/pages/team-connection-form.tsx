import { type FormEvent, type ReactNode, useState } from "react"
import { Plug } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  TEAM_CONNECTION_STRING_MAX_LENGTH,
  teamConnectionFormSchema,
  teamFormError,
} from "@/pages/team-form-validation"

type TeamConnectionFormProps = {
  busy: boolean
  statusSlot: ReactNode
  onConnect: (connectionString: string) => Promise<boolean>
}

export function TeamConnectionForm({
  busy,
  statusSlot,
  onConnect,
}: TeamConnectionFormProps) {
  const [connectionString, setConnectionString] = useState("")
  const [error, setError] = useState<string | null>(null)
  const errorId = "team-connection-string-error"

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validation = teamConnectionFormSchema.safeParse({ connectionString })
    if (!validation.success) {
      setError(teamFormError(validation.error))
      return
    }

    setError(null)
    const connected = await onConnect(validation.data.connectionString)
    if (connected) setConnectionString("")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <label className="block space-y-1.5" htmlFor="team-connection-string">
        <span className="text-xs font-medium text-muted-foreground">
          Connection string
        </span>
        <textarea
          id="team-connection-string"
          value={connectionString}
          onChange={(event) => {
            setConnectionString(event.target.value)
            setError(null)
          }}
          rows={4}
          maxLength={TEAM_CONNECTION_STRING_MAX_LENGTH}
          spellCheck={false}
          placeholder="eusage://connect?url=https://your-eusage.vercel.app&token=eusage_dev_..."
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="w-full resize-none rounded-md border bg-background px-3 py-2 text-xs font-mono outline-none transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        />
      </label>
      {error ? (
        <p id={errorId} className="m-0 text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        {statusSlot}
        <Button type="submit" size="sm" disabled={busy || !connectionString.trim()}>
          <Plug className="size-4" />
          Connect
        </Button>
      </div>
    </form>
  )
}
