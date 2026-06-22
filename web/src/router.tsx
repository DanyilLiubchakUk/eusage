import { ConvexQueryClient } from "@convex-dev/react-query"
import { ClerkProvider, useAuth, useOrganization } from "@clerk/tanstack-react-start"
import { QueryClient } from "@tanstack/react-query"
import { createRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"
import { useCallback, useMemo } from "react"
import { ConvexProviderWithAuth } from "convex/react"
import { routeTree } from "./routeTree.gen"

function getConvexUrl() {
  const convexUrl = import.meta.env.VITE_CONVEX_URL
  if (!convexUrl) {
    throw new Error("Missing VITE_CONVEX_URL. Run Convex dev setup before starting web.")
  }
  return convexUrl
}

export function getRouter() {
  const convexQueryClient = new ConvexQueryClient(getConvexUrl())
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryFn: convexQueryClient.queryFn(),
        queryKeyHashFn: convexQueryClient.hashFn(),
      },
    },
  })

  convexQueryClient.connect(queryClient)

  const router = createRouter({
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true,
    context: {
      queryClient,
    },
    InnerWrap: ({ children }) => (
      <ClerkProvider>
        <ConvexProviderWithAuth client={convexQueryClient.convexClient} useAuth={useConvexClerkAuth}>
          {children}
        </ConvexProviderWithAuth>
      </ClerkProvider>
    ),
  })

  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}

function useConvexClerkAuth() {
  const {
    getToken,
    isLoaded,
    isSignedIn,
    orgId,
    orgRole,
    sessionClaims,
  } = useAuth()
  const { membership, organization } = useOrganization()
  const activeOrganizationId = orgId ?? organization?.id ?? null
  const activeOrganizationRole = orgRole ?? membership?.role ?? null

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      try {
        return await getToken({
          ...(sessionClaims?.aud === "convex" ? {} : { template: "convex" }),
          ...(activeOrganizationId ? { organizationId: activeOrganizationId } : {}),
          skipCache: forceRefreshToken,
        })
      } catch {
        return null
      }
    },
    [activeOrganizationId, activeOrganizationRole, getToken, sessionClaims?.aud]
  )

  return useMemo(
    () => ({
      isLoading: !isLoaded,
      isAuthenticated: isSignedIn === true,
      fetchAccessToken,
    }),
    [fetchAccessToken, isLoaded, isSignedIn]
  )
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
