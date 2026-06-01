import type { FunctionReturnType } from "convex/server"
import type { api } from "../../../../convex/_generated/api"

export type SetupState = FunctionReturnType<typeof api.setup.get>

export function setupStateLabel(state: SetupState) {
  if (state.status === "setup-needed") return "Setup needed"
  return "Setup complete"
}
