import type {
  DesktopApiStore,
  DeviceRecord,
  NewDeviceRecord,
} from "../../convex/desktopApi"
import type { ProviderAccountRecord, NewProviderAccountRecord } from "../../convex/usageIngest"
import {
  hashDeveloperToken,
  type DeveloperRecord,
  type DeveloperTeamRecord,
  type DeveloperTokenRecord,
} from "../../convex/developerTokens"

export async function createDesktopApiTestStore(seed?: {
  organizations?: Array<{ clerkOrganizationId: string; teamId: string }> | null
  token?: Partial<DeveloperTokenRecord>
  developer?: Partial<DeveloperRecord>
  devices?: DeviceRecord[]
  providerAccounts?: ProviderAccountRecord[]
}) {
  const rawToken = "eusage_dev_secret_raw_token"
  const tokenHash = await hashDeveloperToken(rawToken)
  const team: DeveloperTeamRecord = {
    _id: "team-1",
    name: "Acme Team",
    slug: "acme-team",
    reportingTimeZone: "America/New_York",
  }
  const teams = [team]
  const organizations =
    seed?.organizations === undefined
      ? [
          {
            clerkOrganizationId: "org-acme",
            teamId: "team-1",
          },
        ]
      : seed.organizations
  const developers: DeveloperRecord[] = [
    {
      _id: "developer-1",
      teamId: "team-1",
      displayName: "Alex Dev",
      status: "active",
      createdAt: 1780320000000,
      updatedAt: 1780320000000,
      ...seed?.developer,
    },
  ]
  const tokens: DeveloperTokenRecord[] = [
    {
      _id: "token-1",
      teamId: "team-1",
      developerId: "developer-1",
      tokenHash,
      fingerprint: "hash...hash",
      label: "Alex laptop",
      status: "active",
      createdAt: 1780320000000,
      ...seed?.token,
    },
  ]
  const devices: DeviceRecord[] = seed?.devices ? [...seed.devices] : []
  const providerAccounts: ProviderAccountRecord[] = seed?.providerAccounts
    ? [...seed.providerAccounts]
    : []

  const store: DesktopApiStore = {
    getTeam: async () => team,
    getTeamById: async (teamId) =>
      teams.find((candidate) => candidate._id === teamId) ?? null,
    getOrganizationByTeamId: async (teamId) =>
      organizations?.find((organization) => organization.teamId === teamId) ?? null,
    getTokenByHash: async (hash) =>
      tokens.find((token) => token.tokenHash === hash) ?? null,
    getDeveloper: async (developerId) =>
      developers.find((developer) => developer._id === developerId) ?? null,
    getDeviceByTeamAndDeviceId: async (teamId, deviceId) =>
      devices.find((device) => device.teamId === teamId && device.deviceId === deviceId) ?? null,
    createDevice: async (device: NewDeviceRecord) => {
      const created = {
        _id: `device-${devices.length + 1}`,
        ...device,
      }
      devices.push(created)
      return created
    },
    updateDevice: async (deviceRecordId, patch) => {
      const device = devices.find((row) => row._id === deviceRecordId)
      if (!device) throw new Error("Missing device in fake store.")
      Object.assign(device, patch)
      return device
    },
    updateDeveloper: async (developerId, patch) => {
      const developer = developers.find((row) => row._id === developerId)
      if (!developer) throw new Error("Missing developer in fake store.")
      Object.assign(developer, patch)
      return developer
    },
    updateToken: async (tokenId, patch) => {
      const token = tokens.find((row) => row._id === tokenId)
      if (!token) throw new Error("Missing token in fake store.")
      Object.assign(token, patch)
      return token
    },
  }

  return {
    store,
    providerAccountStore: {
      ...store,
      getProviderAccount: async (
        account: Pick<
          ProviderAccountRecord,
          "teamId" | "developerId" | "providerId" | "teamAccountFingerprint"
        >
      ) =>
        providerAccounts.find(
          (row) =>
            row.teamId === account.teamId &&
            row.developerId === account.developerId &&
            row.providerId === account.providerId &&
            row.teamAccountFingerprint === account.teamAccountFingerprint
        ) ?? null,
      createProviderAccount: async (account: NewProviderAccountRecord) => {
        const created = {
          _id: `provider-account-${providerAccounts.length + 1}`,
          ...account,
        }
        providerAccounts.push(created)
        return created
      },
      updateProviderAccount: async (
        accountId: string,
        patch: Partial<NewProviderAccountRecord>
      ) => {
        const account = providerAccounts.find((row) => row._id === accountId)
        if (!account) throw new Error("Missing provider account in fake store.")
        Object.assign(account, patch)
        return account
      },
    },
    rawToken,
    tokenHash,
    developers,
    tokens,
    devices,
    providerAccounts,
  }
}
