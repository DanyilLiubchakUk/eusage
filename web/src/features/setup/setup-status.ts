import type { FunctionReturnType } from "convex/server"
import type { api } from "../../../../convex/_generated/api"

export type SetupState = FunctionReturnType<typeof api.setup.get>
export type SetupClaimResult = FunctionReturnType<typeof api.setup.claimOwner>

export function setupStateLabel(state: SetupState) {
  if (state.status === "setup-needed") return "Setup needed"
  if (state.status === "setup-broken") return "Setup needs repair"
  return "Setup complete"
}
