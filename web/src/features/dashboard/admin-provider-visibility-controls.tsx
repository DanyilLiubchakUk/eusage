import { formatProviderName } from "./dashboard-formatting"

export type AdminProviderFilter = {
  providerId: string
  providerName: string
  visible: boolean
}

type AdminProviderVisibilityControlsProps = {
  providers: AdminProviderFilter[]
  onChange?: (visibleProviderIds: string[] | null) => Promise<void> | void
}

export function AdminProviderVisibilityControls({
  providers,
  onChange,
}: AdminProviderVisibilityControlsProps) {
  if (providers.length === 0) return null

  async function toggle(providerId: string) {
    if (!onChange) return

    const selected = new Set(
      providers.filter((provider) => provider.visible).map((provider) => provider.providerId)
    )
    if (selected.has(providerId)) {
      selected.delete(providerId)
    } else {
      selected.add(providerId)
    }

    const next = providers
      .map((provider) => provider.providerId)
      .filter((id) => selected.has(id))
    await onChange(next.length === providers.length ? null : next)
  }

  return (
    <div
      className="[scrollbar-width:thin] [scrollbar-color:#d1d5db_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:hover:bg-gray-400 flex w-fit max-w-full min-w-0 gap-2 overflow-x-auto overscroll-x-contain"
      aria-label="Provider visibility controls"
    >
      {providers.map((provider) => (
        <label
          key={provider.providerId}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-muted-foreground shadow-xs"
        >
          <input
            className="size-4 accent-primary"
            type="checkbox"
            checked={provider.visible}
            disabled={!onChange}
            onChange={() => void toggle(provider.providerId)}
          />
          <span>{provider.providerName || formatProviderName(provider.providerId)}</span>
        </label>
      ))}
    </div>
  )
}
