/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as desktopApi from "../desktopApi.js";
import type * as desktopApiCore from "../desktopApiCore.js";
import type * as developerTokenLifecycle from "../developerTokenLifecycle.js";
import type * as developerTokens from "../developerTokens.js";
import type * as developers from "../developers.js";
import type * as setup from "../setup.js";
import type * as setupClaim from "../setupClaim.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  desktopApi: typeof desktopApi;
  desktopApiCore: typeof desktopApiCore;
  developerTokenLifecycle: typeof developerTokenLifecycle;
  developerTokens: typeof developerTokens;
  developers: typeof developers;
  setup: typeof setup;
  setupClaim: typeof setupClaim;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
