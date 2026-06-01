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
import type * as usageIngest from "../usageIngest.js";
import type * as usageIngestCore from "../usageIngestCore.js";
import type * as usageIngestRedaction from "../usageIngestRedaction.js";
import type * as usageIngestTypes from "../usageIngestTypes.js";
import type * as usageIngestValidation from "../usageIngestValidation.js";

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
  usageIngest: typeof usageIngest;
  usageIngestCore: typeof usageIngestCore;
  usageIngestRedaction: typeof usageIngestRedaction;
  usageIngestTypes: typeof usageIngestTypes;
  usageIngestValidation: typeof usageIngestValidation;
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
