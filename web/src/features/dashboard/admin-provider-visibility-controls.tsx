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
    <div className="admin-provider-filter" aria-label="Provider visibility controls">
      {providers.map((provider) => (
        <label key={provider.providerId}>
          <input
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
