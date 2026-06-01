import { api } from "../../../../convex/_generated/api"
import type { FunctionReturnType } from "convex/server"

export type DevelopersState = FunctionReturnType<typeof api.developers.list>
export type CreateDeveloperResult = FunctionReturnType<typeof api.developers.create>
