import { ConvexQueryClient } from "@convex-dev/react-query"
import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start"
import { QueryClient } from "@tanstack/react-query"
import { createRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"
import { ConvexProviderWithClerk } from "convex/react-clerk"
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
    Wrap: ({ children }) => (
      <ClerkProvider>
        <ConvexProviderWithClerk client={convexQueryClient.convexClient} useAuth={useAuth}>
          {children}
        </ConvexProviderWithClerk>
      </ClerkProvider>
    ),
  })

  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
