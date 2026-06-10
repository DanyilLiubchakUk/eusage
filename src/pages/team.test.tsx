import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeamPage } from "@/pages/team";
import type { TeamConnectionViewState } from "@/hooks/app/use-team-connection";
import type { ProviderAccountSharingSettings } from "@/lib/provider-account-sharing";
import type { LocalProviderAccount } from "@/lib/provider-account-registry";
import type { ProviderAccountSettingsGroup } from "@/lib/provider-account-settings";

const teamHook = vi.hoisted(() => ({
  state: {
    status: "disconnected",
    connection: null,
    message: null,
  } as TeamConnectionViewState,
  connect: vi.fn(),
  checkIn: vi.fn(),
  disconnect: vi.fn(),
  updateDeviceName: vi.fn(),
}));

vi.mock("@/hooks/app/use-team-connection", () => ({
  useTeamConnection: () => ({
    state: teamHook.state,
    connect: teamHook.connect,
    checkIn: teamHook.checkIn,
    disconnect: teamHook.disconnect,
    updateDeviceName: teamHook.updateDeviceName,
  }),
}));

describe("TeamPage", () => {
  const sharingReset = vi.fn(async () => undefined);
  const sharingChange = vi.fn();

  beforeEach(() => {
    teamHook.state = {
      status: "disconnected",
      connection: null,
      message: null,
    };
    teamHook.connect.mockReset();
    teamHook.checkIn.mockReset();
    teamHook.disconnect.mockReset();
    teamHook.updateDeviceName.mockReset();
    teamHook.connect.mockResolvedValue({ ok: true });
    teamHook.checkIn.mockResolvedValue({ ok: true });
    teamHook.disconnect.mockResolvedValue({ ok: true });
    teamHook.updateDeviceName.mockResolvedValue({ ok: true });
    sharingReset.mockClear();
    sharingChange.mockClear();
  });

  it("does not flash the connection form while loading", () => {
    teamHook.state = {
      status: "loading",
      connection: null,
      message: null,
    };

    renderTeamPage();

    expect(screen.getByText("Loading team connection...")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Connection string"),
    ).not.toBeInTheDocument();
  });

  it("submits the pasted connection string", async () => {
    renderTeamPage();

    expect(screen.getByLabelText("Connection string")).toHaveAttribute(
      "maxlength",
      "512",
    );

    await userEvent.type(
      screen.getByLabelText("Connection string"),
      "eusage://connect?url=https://team.example.com&token=eusage_dev_secret",
    );
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));

    expect(teamHook.connect).toHaveBeenCalledWith(
      "eusage://connect?url=https://team.example.com&token=eusage_dev_secret",
    );
  });

  it("validates the connection string before connect", async () => {
    renderTeamPage();

    await userEvent.type(
      screen.getByLabelText("Connection string"),
      "https://team.example.com",
    );
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));

    expect(teamHook.connect).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Connection string must start with eusage://connect.",
    );
  });

  it("calls onConnected after connecting", async () => {
    const onConnected = vi.fn();
    renderTeamPage({ onConnected });

    await userEvent.type(
      screen.getByLabelText("Connection string"),
      "eusage://connect?url=https://team.example.com&token=eusage_dev_secret",
    );
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));

    expect(sharingReset).toHaveBeenCalledTimes(1);
    expect(onConnected).toHaveBeenCalledTimes(1);
  });

  it("shows connected metadata and requires disconnect confirmation", async () => {
    teamHook.state = {
      status: "connected",
      connection: {
        teamUrl: "https://team.example.com",
        teamName: "Acme Team",
        reportingTimeZone: "America/New_York",
        tokenFingerprint: "abcd1234...wxyz7890",
        deviceId: "device-1",
        deviceName: "Alex MacBook",
        detectedDeviceName: "Alex MacBook",
        deviceNameOverride: null,
        endpoints: {
          teamConfig: "/api/v1/team-config",
          deviceCheckIn: "/api/v1/device/check-in",
          usageBatch: "/api/v1/usage/batch",
          deviceDisconnect: "/api/v1/device/disconnect",
        },
        syncStatus: "connected",
        lastContactAt: "2026-06-01T12:00:00.000Z",
        deviceStatus: "connected",
        lastError: null,
      },
      message: "Device checked in.",
    };

    renderTeamPage();

    expect(screen.getByText("Acme Team")).toBeInTheDocument();
    expect(screen.getByText("abcd1234...wxyz7890")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Alex MacBook")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(teamHook.disconnect).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(teamHook.disconnect).toHaveBeenCalledTimes(1);
    expect(sharingReset).toHaveBeenCalledTimes(1);
  });

  it("saves and resets the device name override", async () => {
    teamHook.state = {
      status: "connected",
      connection: {
        teamUrl: "https://team.example.com",
        teamName: "Acme Team",
        reportingTimeZone: "America/New_York",
        tokenFingerprint: "abcd1234...wxyz7890",
        deviceId: "device-1",
        deviceName: "Desk Mac",
        detectedDeviceName: "Alex MacBook",
        deviceNameOverride: "Desk Mac",
        endpoints: {
          teamConfig: "/api/v1/team-config",
          deviceCheckIn: "/api/v1/device/check-in",
          usageBatch: "/api/v1/usage/batch",
          deviceDisconnect: "/api/v1/device/disconnect",
        },
        syncStatus: "connected",
        lastContactAt: "2026-06-01T12:00:00.000Z",
        deviceStatus: "connected",
        lastError: null,
      },
      message: null,
    };

    renderTeamPage();

    expect(screen.getByLabelText("Device name")).toHaveAttribute(
      "maxlength",
      "80",
    );

    await userEvent.clear(screen.getByLabelText("Device name"));
    await userEvent.type(screen.getByLabelText("Device name"), "Desk Mac Pro");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(teamHook.updateDeviceName).toHaveBeenCalledWith("Desk Mac Pro");

    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(teamHook.updateDeviceName).toHaveBeenCalledWith(null);
  });

  it("lists visible Provider Accounts for sharing only", async () => {
    teamHook.state = {
      status: "connected",
      connection: connectedSettings(),
      message: null,
    };

    renderTeamPage({
      providerAccountGroups: [
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
      providerAccountSharingSettings: { sharedLocalAccountFingerprints: [] },
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

    expect(sharingChange).toHaveBeenCalledWith("fp-work", true);
  });

  it("shows shared Provider Accounts as active sharing rows", () => {
    teamHook.state = {
      status: "connected",
      connection: connectedSettings(),
      message: null,
    };

    renderTeamPage({
      providerAccountGroups: [
        providerGroup({
          visibleAccounts: [
            providerAccount({
              label: "Work Codex",
              localAccountFingerprint: "fp-work",
            }),
          ],
        }),
      ],
      providerAccountSharingSettings: {
        sharedLocalAccountFingerprints: ["fp-work"],
      },
    });

    expect(screen.getByText("1/1 shared")).toBeInTheDocument();
    expect(screen.getByText("Work Codex")).toHaveClass("text-foreground");
    expect(
      screen.getByRole("button", {
        name: "Stop sharing Work Codex with team",
      }),
    ).toBeInTheDocument();
  });

  function renderTeamPage(
    overrides: Partial<{
      providerAccountGroups: ProviderAccountSettingsGroup[];
      providerAccountSharingSettings: ProviderAccountSharingSettings;
      onConnected: () => void;
    }> = {},
  ) {
    return render(
      <TeamPage
        plugins={[]}
        providerAccountGroups={overrides.providerAccountGroups ?? []}
        providerAccountSharingSettings={
          overrides.providerAccountSharingSettings ?? {
            sharedLocalAccountFingerprints: [],
          }
        }
        onProviderAccountSharingChange={sharingChange}
        onProviderAccountSharingReset={sharingReset}
        onConnected={overrides.onConnected}
      />,
    );
  }
});

function connectedSettings() {
  return {
    teamUrl: "https://team.example.com",
    teamName: "Acme Team",
    reportingTimeZone: "America/New_York",
    tokenFingerprint: "abcd1234...wxyz7890",
    deviceId: "device-1",
    deviceName: "Alex MacBook",
    detectedDeviceName: "Alex MacBook",
    deviceNameOverride: null,
    endpoints: {
      teamConfig: "/api/v1/team-config",
      deviceCheckIn: "/api/v1/device/check-in",
      usageBatch: "/api/v1/usage/batch",
      deviceDisconnect: "/api/v1/device/disconnect",
    },
    syncStatus: "connected" as const,
    lastContactAt: "2026-06-01T12:00:00.000Z",
    deviceStatus: "connected" as const,
    lastError: null,
  };
}

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
