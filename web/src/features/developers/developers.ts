import { api } from "../../../../convex/_generated/api"
import type { FunctionReturnType } from "convex/server"

export type DevelopersState = FunctionReturnType<typeof api.developers.list>
export type CreateDeveloperResult = FunctionReturnType<typeof api.developers.create>
export type RotateDeveloperTokenResult = FunctionReturnType<typeof api.developers.rotate>
export type RevokeDeveloperTokenResult = FunctionReturnType<typeof api.developers.revoke>
export type ReenableDeveloperResult = FunctionReturnType<typeof api.developers.reenable>
export type DeveloperMutationResult =
  | CreateDeveloperResult
  | RotateDeveloperTokenResult
  | RevokeDeveloperTokenResult
  | ReenableDeveloperResult
