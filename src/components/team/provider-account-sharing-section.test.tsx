import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderAccountSharingSection } from "@/components/team/provider-account-sharing-section";
import type { LocalProviderAccount } from "@/lib/provider-account-registry";
import type { ProviderAccountSettingsGroup } from "@/lib/provider-account-settings";

describe("ProviderAccountSharingSection", () => {
  const onSharingChange = vi.fn();
  const onSharingConfirm = vi.fn();

  beforeEach(() => {
    onSharingChange.mockClear();
    onSharingConfirm.mockClear();
  });

  it("lists visible Provider Accounts for sharing only", async () => {
    renderSection({
      groups: [
        providerGroup({
          visibleAccounts: [
            providerAccount({
              label: "Work Codex",
              localAccountFingerprint: "fp-work",
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
        }),
      ],
    });

    expect(screen.getByText("0/1 shared")).toBeInTheDocument();
    expect(screen.getByText("Work Codex")).toHaveClass(
      "text-muted-foreground/75",
    );
    expect(screen.queryByText("Hidden Codex")).not.toBeInTheDocument();
    expect(screen.queryByText("Old Codex")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Share Work Codex with team" }),
    );

    expect(onSharingChange).toHaveBeenCalledWith("fp-work", true);
  });

  it("requires confirmation before sharing lower-confidence Provider Accounts", async () => {
    renderSection({
      groups: [
        providerGroup({
          visibleAccounts: [
            providerAccount({
              label: "Claude account 1",
              identityConfidence: "medium",
              localAccountFingerprint: "fp-work",
            }),
          ],
        }),
      ],
    });

    await userEvent.click(
      screen.getByRole("button", { name: "Share Claude account 1 with team" }),
    );

    expect(screen.getByText("Confirm account before sharing.")).toBeInTheDocument();
    expect(onSharingChange).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole("button", {
        name: "Confirm sharing Claude account 1",
      }),
    );

    expect(onSharingConfirm).toHaveBeenCalledWith("fp-work");
    expect(onSharingChange).not.toHaveBeenCalled();
  });

  it("shows shared Provider Accounts as active sharing rows", () => {
    renderSection({
      groups: [
        providerGroup({
          visibleAccounts: [
            providerAccount({
              label: "Work Codex",
              localAccountFingerprint: "fp-work",
            }),
          ],
        }),
      ],
      sharedLocalAccountFingerprints: ["fp-work"],
    });

    expect(screen.getByText("1/1 shared")).toBeInTheDocument();
    expect(screen.getByText("Work Codex")).toHaveClass("text-foreground");
    expect(
      screen.getByRole("button", {
        name: "Stop sharing Work Codex with team",
      }),
    ).toBeInTheDocument();
  });

  function renderSection(
    overrides: Partial<{
      groups: ProviderAccountSettingsGroup[];
      sharedLocalAccountFingerprints: string[];
      syncError: string | null;
    }> = {},
  ) {
    return render(
      <ProviderAccountSharingSection
        groups={overrides.groups ?? [providerGroup()]}
        sharingSettings={{
          sharedLocalAccountFingerprints:
            overrides.sharedLocalAccountFingerprints ?? [],
        }}
        syncError={overrides.syncError}
        onSharingChange={onSharingChange}
        onSharingConfirm={onSharingConfirm}
      />,
    );
  }
});

function providerGroup(
  overrides: Partial<ProviderAccountSettingsGroup> = {},
): ProviderAccountSettingsGroup {
  return {
    providerId: "codex",
    providerName: "Codex",
    providerIconUrl: "/codex.svg",
    visibleAccounts: [providerAccount()],
    hiddenAccounts: [],
    notDetectedAccounts: [],
    ...overrides,
  };
}

function providerAccount(
  overrides: Partial<LocalProviderAccount> = {},
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
  };
}
