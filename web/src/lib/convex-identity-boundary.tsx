import { useAuth, useOrganization } from "@clerk/tanstack-react-start"
import { ConvexQueryClient } from "@convex-dev/react-query"
import type { QueryClient } from "@tanstack/react-query"
import { ConvexProviderWithAuth } from "convex/react"
import { Fragment, useCallback, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react"

type AuthHook = ComponentProps<typeof ConvexProviderWithAuth>["useAuth"]

export function ConvexIdentityBoundary({
  children,
  queryClient,
  initialClient,
  useConvexClerkAuth,
}: {
  children: ReactNode
  queryClient: QueryClient
  initialClient: ConvexQueryClient
  useConvexClerkAuth: AuthHook
}) {
  const { isLoaded, isSignedIn, userId, sessionId, orgId, orgRole } = useAuth()
  const { organization, membership } = useOrganization()
  const identity = JSON.stringify(!isLoaded ? ["loading"] : isSignedIn
    ? [userId ?? null, sessionId ?? null, orgId ?? organization?.id ?? null, orgRole ?? membership?.role ?? null]
    : ["anonymous"])
  const [scope, setScope] = useState({ identity, client: initialClient })
  const [failure, setFailure] = useState<Error | null>(null)
  const activeClient = useRef(initialClient)
  const useScopedAuth = useCallback(() => {
    const auth = useConvexClerkAuth()
    return scope.identity === identity
      ? auth
      : { ...auth, isLoading: true, isAuthenticated: false }
  }, [identity, scope.identity, useConvexClerkAuth])

  useEffect(() => {
    if (scope.identity === identity) return
    const reportFailure = (error: unknown) => {
      console.error("Failed to close the previous Convex client:", error)
      setFailure(error instanceof Error ? error : new Error(String(error)))
    }
    // The previous identity's subtree and auth have already cleaned up.
    // Clearing also cancels pending queries and removes live subscriptions.
    queryClient.clear()
    activeClient.current.unsubscribe?.()
    void activeClient.current.convexClient.close().catch(reportFailure)
    const client = new ConvexQueryClient(initialClient.convexClient.url)
    queryClient.setDefaultOptions({
      ...queryClient.getDefaultOptions(),
      queries: {
        ...queryClient.getDefaultOptions().queries,
        queryFn: client.queryFn(),
      },
    })
    client.connect(queryClient)
    activeClient.current = client
    setScope({ identity, client })
  }, [identity, initialClient, queryClient, scope.identity])

  if (failure) throw failure

  return (
    <ConvexProviderWithAuth
      key={scope.identity}
      client={scope.client.convexClient}
      useAuth={useScopedAuth}
    >
      <Fragment key={identity}>{children}</Fragment>
    </ConvexProviderWithAuth>
  )
}
