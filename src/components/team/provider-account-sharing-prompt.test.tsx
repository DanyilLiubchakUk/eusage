import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ProviderAccountSharingPrompt } from "@/components/team/provider-account-sharing-prompt"
import type { LocalProviderAccount } from "@/lib/provider-account-registry"
import type { ProviderAccountSettingsGroup } from "@/lib/provider-account-settings"

describe("ProviderAccountSharingPrompt", () => {
  const onClose = vi.fn()
  const onShareSelected = vi.fn()

  beforeEach(() => {
    onClose.mockClear()
    onShareSelected.mockClear()
  })

  it("starts all Provider Accounts unchecked", () => {
    renderPrompt()

    const dialog = screen.getByRole("dialog", { name: "Share Provider Accounts" })
    expect(dialog).toHaveClass("max-h-[88%]", "w-[92%]", "overflow-hidden")
    expect(dialog).not.toHaveClass("h-[88%]")
    expect(screen.getByTestId("provider-account-sharing-scroll"))
      .toHaveClass("custom-scrollbar", "overflow-x-hidden")
    const closeButton = screen.getByRole("button", {
      name: "Close Provider Account sharing prompt",
    })
    expect(closeButton).toHaveClass("size-8")
    expect(closeButton.querySelector("svg")).toHaveClass("size-5")
    expect(screen.getByRole("checkbox", { name: "Share Work Codex" }))
      .not.toBeChecked()
    expect(screen.getByRole("checkbox", { name: "Share Side Codex" }))
      .not.toBeChecked()
    expect(screen.getByRole("button", { name: "Share selected" })).toBeDisabled()
    expect(onShareSelected).not.toHaveBeenCalled()
  })

  it("skips without uploading", async () => {
    renderPrompt()

    await userEvent.click(screen.getByRole("button", { name: "Skip for now" }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onShareSelected).not.toHaveBeenCalled()
  })

  it("closes without uploading", async () => {
    renderPrompt()

    await userEvent.click(
      screen.getByRole("button", {
        name: "Close Provider Account sharing prompt",
      })
    )

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onShareSelected).not.toHaveBeenCalled()
  })

  it("closes on Escape without uploading", async () => {
    renderPrompt()

    await userEvent.keyboard("{Escape}")

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onShareSelected).not.toHaveBeenCalled()
  })

  it("shares selected visible Provider Accounts only", async () => {
    renderPrompt()

    expect(screen.queryByText("Hidden Codex")).not.toBeInTheDocument()
    expect(screen.queryByText("Old Codex")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("checkbox", { name: "Share Work Codex" }))
    await userEvent.click(screen.getByRole("checkbox", { name: "Share Side Codex" }))
    await userEvent.click(screen.getByRole("button", { name: "Share selected" }))

    expect(onShareSelected).toHaveBeenCalledTimes(2)
    expect(onShareSelected).toHaveBeenNthCalledWith(1, "fp-work")
    expect(onShareSelected).toHaveBeenNthCalledWith(2, "fp-side")
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("shows empty state when no Provider Accounts are visible", () => {
    renderPrompt({
      groups: [
        providerGroup({
          visibleAccounts: [],
        }),
      ],
    })

    expect(screen.getByText("No visible Provider Accounts to share."))
      .toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Share selected" })).toBeDisabled()
  })

  function renderPrompt(
    overrides: Partial<{
      groups: ProviderAccountSettingsGroup[]
    }> = {}
  ) {
    return render(
      <ProviderAccountSharingPrompt
        groups={overrides.groups ?? [providerGroup()]}
        onClose={onClose}
        onShareSelected={onShareSelected}
      />
    )
  }
})

function providerGroup(
  overrides: Partial<ProviderAccountSettingsGroup> = {}
): ProviderAccountSettingsGroup {
  return {
    providerId: "codex",
    providerName: "Codex",
    providerIconUrl: "/codex.svg",
    visibleAccounts: [
      providerAccount({
        label: "Work Codex",
        localAccountFingerprint: "fp-work",
      }),
      providerAccount({
        label: "Side Codex",
        localAccountFingerprint: "fp-side",
      }),
    ],
    hiddenAccounts: [
      providerAccount({
        label: "Hidden Codex",
        localAccountFingerprint: "fp-hidden",
        visibility: "hidden",
      }),
    ],
    notDetectedAccounts: [
      providerAccount({
        label: "Old Codex",
        localAccountFingerprint: "fp-old",
        detectionState: "notDetected",
      }),
    ],
    ...overrides,
  }
}

function providerAccount(
  overrides: Partial<LocalProviderAccount> = {}
): LocalProviderAccount {
  return {
    providerId: "codex",
    localAccountFingerprint: "fp-work",
    label: "Work Codex",
    visibility: "visible",
    identityConfidence: "high",
    confirmationState: "unconfirmed",
    firstSeenAt: "2026-06-01T00:00:00.000Z",
    lastSeenAt: "2026-06-02T00:00:00.000Z",
    detectionState: "detected",
    ...overrides,
  }
}
