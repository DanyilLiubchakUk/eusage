import { Eye, EyeOff } from "lucide-react";
import { ProviderAccountIcon } from "@/components/provider-account-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProviderAccountSharingSettings } from "@/lib/provider-account-sharing";
import type { LocalProviderAccount } from "@/lib/provider-account-registry";
import type { ProviderAccountSettingsGroup } from "@/lib/provider-account-settings";

type ProviderAccountSharingSectionProps = {
  groups: ProviderAccountSettingsGroup[];
  sharingSettings: ProviderAccountSharingSettings;
  syncError?: string | null;
  onSharingChange: (localAccountFingerprint: string, shared: boolean) => void;
};

export function ProviderAccountSharingSection({
  groups,
  sharingSettings,
  syncError,
  onSharingChange,
}: ProviderAccountSharingSectionProps) {
  const shareableGroups = groups
    .map((group) => ({
      ...group,
      accounts: group.visibleAccounts,
    }))
    .filter((group) => group.accounts.length > 0);
  const sharedFingerprints = new Set(
    sharingSettings.sharedLocalAccountFingerprints,
  );
  const shareableCount = shareableGroups.reduce(
    (count, group) => count + group.accounts.length,
    0,
  );
  const sharedCount = shareableGroups.reduce(
    (count, group) =>
      count +
      group.accounts.filter((account) =>
        sharedFingerprints.has(account.localAccountFingerprint),
      ).length,
    0,
  );

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Provider Account Sharing</h2>
        </div>
        <Badge variant="outline">
          {sharedCount}/{shareableCount} shared
        </Badge>
      </div>
      {syncError ? (
        <p role="alert" className="mb-2 text-xs text-destructive">
          {syncError}
        </p>
      ) : null}

      {shareableGroups.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
          No visible Provider Accounts to share.
        </div>
      ) : (
        <div className="rounded-lg bg-muted/50 p-1">
          <div className="divide-y divide-border/60 overflow-hidden rounded-md bg-card">
            {shareableGroups.map((group) => (
              <ProviderAccountSharingGroup
                key={group.providerId}
                providerName={group.providerName}
                providerIconUrl={group.providerIconUrl}
                accounts={group.accounts}
                sharedFingerprints={sharedFingerprints}
                onSharingChange={onSharingChange}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ProviderAccountSharingGroup({
  providerName,
  providerIconUrl,
  accounts,
  sharedFingerprints,
  onSharingChange,
}: {
  providerName: string;
  providerIconUrl?: string;
  accounts: LocalProviderAccount[];
  sharedFingerprints: Set<string>;
  onSharingChange: (localAccountFingerprint: string, shared: boolean) => void;
}) {
  const hasMultipleAccounts = accounts.length > 1;
  const accountListClassName = hasMultipleAccounts
    ? "mt-1.5 grid gap-0.5"
    : "mt-1 grid gap-0.5";

  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-2 px-1 pb-1.5">
        <ProviderAccountIcon iconUrl={providerIconUrl} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{providerName}</h3>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {accounts.length}
        </span>
      </div>
      <div className={accountListClassName}>
        {accounts.map((account) => {
          const isShared = sharedFingerprints.has(
            account.localAccountFingerprint,
          );
          return (
            <div
              key={account.localAccountFingerprint}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 py-1"
            >
              <span
                className={
                  isShared
                    ? "min-w-0 truncate px-1 text-sm font-medium text-foreground"
                    : "min-w-0 truncate px-1 text-sm font-medium text-muted-foreground/75 opacity-70"
                }
              >
                {account.label}
              </span>
              <SharingButton
                account={account}
                isShared={isShared}
                onSharingChange={onSharingChange}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SharingButton({
  account,
  isShared,
  onSharingChange,
}: {
  account: LocalProviderAccount;
  isShared: boolean;
  onSharingChange: (localAccountFingerprint: string, shared: boolean) => void;
}) {
  const label = isShared
    ? `Stop sharing ${account.label} with team`
    : `Share ${account.label} with team`;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      onClick={() =>
        onSharingChange(account.localAccountFingerprint, !isShared)
      }
    >
      {isShared ? (
        <Eye aria-hidden className="size-4" />
      ) : (
        <EyeOff aria-hidden className="size-4" />
      )}
    </Button>
  );
}
