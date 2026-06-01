/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * Re-run `bunx convex codegen` after configuring a Convex deployment.
 */
import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server"
import type * as setup from "../setup.js"

declare const fullApi: ApiFromModules<{
  setup: typeof setup
}>

export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>
