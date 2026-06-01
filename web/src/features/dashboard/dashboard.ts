import { api } from "../../../../convex/_generated/api"
import type { FunctionReturnType } from "convex/server"

export type DashboardSourceState = FunctionReturnType<typeof api.dashboard.sourceRows>
