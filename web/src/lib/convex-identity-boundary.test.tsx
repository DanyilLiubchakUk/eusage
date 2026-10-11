import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { ConvexQueryClient, convexQuery } from "@convex-dev/react-query"
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { StrictMode, useState } from "react"
import { renderToString } from "react-dom/server"
import { makeFunctionReference } from "convex/server"
import type { ConvexReactClient } from "convex/react"
import { useConvexAuth } from "convex/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ConvexIdentityBoundary } from "./convex-identity-boundary"
import { createMemoryHistory, createRoute, createRouter, RouterProvider } from "@tanstack/react-router"
import { Route as rootRoute } from "../routes/__root"

const state = vi.hoisted(() => ({
  auth: {
    isLoaded: true,
    isSignedIn: true,
    userId: "user-A" as string | null,
    sessionId: "session-A" as string | null,
    orgId: "org-A" as string | null,
    orgRole: "org:admin",
  },
  clients: [] as Array<{
    confirm: (authenticated: boolean) => void
    publish: (value: { team: string }) => void
    close: () => Promise<void>
    listeners: Set<() => void>
  }>,
}))

vi.mock("@clerk/tanstack-react-start", () => ({
  useAuth: () => state.auth,
  useOrganization: () => ({ organization: null, membership: null }),
}))

// Keep the real Convex auth provider and QueryClient adapter; replace only transport.
vi.mock("@convex-dev/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@convex-dev/react-query")>()
  class Transport {
    url: string
    confirm = (_authenticated: boolean) => {}
    listeners = new Set<() => void>()
    result: { team: string } | undefined
    pending: Array<(value: { team: string }) => void> = []
    closed = false
    constructor(url: string) {
      this.url = url
      state.clients.push(this)
    }
    setAuth(_fetchToken: unknown, onChange: (authenticated: boolean) => void) {
      if (this.closed) throw new Error("Cannot authenticate a closed client")
      this.confirm = onChange
    }
    clearAuth() {
      if (this.closed) throw new Error("Cannot clear auth on a closed client")
    }
    watchQuery() {
      return {
        localQueryResult: () => this.result,
        onUpdate: (listener: () => void) => {
          this.listeners.add(listener)
          return () => { this.listeners.delete(listener) }
        },
      }
    }
    query() {
      return this.result
        ? Promise.resolve(this.result)
        : new Promise<{ team: string }>((resolve) => this.pending.push(resolve))
    }
    publish(value: { team: string }) {
      this.result = value
      for (const resolve of this.pending.splice(0)) resolve(value)
      for (const listener of this.listeners) listener()
    }
    close = vi.fn(async () => {
      this.closed = true
      this.listeners.clear()
    })
  }
  return {
    ...actual,
    ConvexQueryClient: class extends actual.ConvexQueryClient {
      constructor(url: string) {
        super(new Transport(url) as unknown as ConvexReactClient)
      }
    },
  }
})

const developers = makeFunctionReference<"query", {}, { team: string }>("developers:list")
const query = convexQuery(developers, {})
const publicQuery = convexQuery(makeFunctionReference<"query", {}, { team: string }>("setup:get"), {})
const fetchToken = async () => "test-token"
function useTestAuth() {
  return { isLoading: !state.auth.isLoaded, isAuthenticated: state.auth.isSignedIn, fetchAccessToken: fetchToken }
}

const fixtures: Array<{ client: QueryClient; convex: ConvexQueryClient; unmount?: () => void }> = []
function fixture(publicPage = false, strict = false) {
  const convex = new ConvexQueryClient("https://audit.invalid")
  const client = new QueryClient({
    defaultOptions: {
      queries: { queryFn: convex.queryFn(), queryKeyHashFn: convex.hashFn(), retry: false },
    },
  })
  convex.connect(client)
  const result = {
    client,
    convex,
    get view() {
      const boundary = (
        <ConvexIdentityBoundary queryClient={client} initialClient={convex} useConvexClerkAuth={useTestAuth}>
          {publicPage ? <PublicPage /> : <PrivatePage />}
        </ConvexIdentityBoundary>
      )
      return <QueryClientProvider client={client}>{strict ? <StrictMode>{boundary}</StrictMode> : boundary}</QueryClientProvider>
    },
    unmount: undefined as (() => void) | undefined,
  }
  fixtures.push(result)
  return result
}

function PrivatePage() {
  const [privateInput, setPrivateInput] = useState("")
  const { isAuthenticated } = useConvexAuth()
  const { data } = useQuery(convexQuery(developers, state.auth.isSignedIn && isAuthenticated ? {} : "skip"))
  if (state.auth.isSignedIn && !isAuthenticated) return <p role="status">Loading workspace...</p>
  return <><p>{data?.team ?? "pending"}</p><input aria-label="Private draft" value={privateInput} onChange={(event) => setPrivateInput(event.target.value)} /></>
}

function PublicPage() {
  const { data } = useQuery(publicQuery)
  return <p>{data?.team ?? "pending"}</p>
}

beforeEach(() => {
  state.auth = { isLoaded: true, isSignedIn: true, userId: "user-A", sessionId: "session-A", orgId: "org-A", orgRole: "org:admin" }
  state.clients.length = 0
})

afterEach(async () => {
  for (const value of fixtures.splice(0)) {
    value.unmount?.()
    value.client.clear()
    value.convex.unsubscribe?.()
  }
  for (const client of state.clients) await client.close()
})

describe("Convex identity isolation", () => {
  it.each([
    { orgId: "org-B" },
    { userId: "user-B" },
    { sessionId: "session-B" },
    { orgRole: "org:member" },
  ])("clears cached and live data before confirming identity %j", async (change) => {
    const value = fixture()
    const view = render(value.view)
    value.unmount = view.unmount
    expect(screen.queryByText("Team A")).toBeNull()
    act(() => state.clients[0].confirm(true))
    act(() => state.clients[0].publish({ team: "Team A" }))
    await screen.findByText("Team A")
    fireEvent.change(screen.getByLabelText("Private draft"), { target: { value: "Private A" } })
    const previous = state.clients[0]
    expect(previous.listeners.size).toBe(1)

    state.auth = { ...state.auth, ...change }
    view.rerender(value.view)

    expect(screen.queryByText("Team A")).toBeNull()
    expect(screen.getByRole("status")).toHaveTextContent("Loading workspace")
    expect(value.client.getQueryData(query.queryKey)).toBeUndefined()
    expect(value.client.isFetching()).toBe(0)
    expect(previous.close).toHaveBeenCalledOnce()
    expect(previous.listeners.size).toBe(0)
    act(() => previous.publish({ team: "late Team A" }))
    expect(value.client.getQueryData(query.queryKey)).toBeUndefined()

    const current = state.clients.at(-1)!
    act(() => current.confirm(true))
    act(() => current.publish({ team: "Team B" }))
    await screen.findByText("Team B")
    expect(screen.getByLabelText("Private draft")).toHaveValue("")
    expect(value.client.getQueryData(query.queryKey)).toEqual({ team: "Team B" })
  })

  it("cancels old in-flight queries and clears mutation results on sign-out", async () => {
    const value = fixture()
    const view = render(value.view)
    value.unmount = view.unmount
    act(() => state.clients[0].confirm(true))
    await waitFor(() => expect(value.client.isFetching()).toBe(1))
    await value.client.getMutationCache().build(value.client, { mutationFn: async () => "private test result" }).execute(undefined)
    const previous = state.clients[0]

    state.auth = { ...state.auth, isSignedIn: false, userId: null, sessionId: null, orgId: null }
    view.rerender(value.view)
    expect(value.client.getMutationCache().getAll()).toHaveLength(0)
    expect(value.client.isFetching()).toBe(0)
    act(() => previous.publish({ team: "late Team A" }))
    await act(async () => {})
    expect(screen.queryByText("late Team A")).toBeNull()
    expect(value.client.getQueryData(query.queryKey)).toBeUndefined()
  })

  it("ignores an old in-flight result after a rapid switch to another organization", async () => {
    const value = fixture(false, true)
    const view = render(value.view)
    value.unmount = view.unmount
    act(() => state.clients[0].confirm(true))
    await waitFor(() => expect(value.client.isFetching()).toBe(1))
    const previous = state.clients[0]

    state.auth = { ...state.auth, orgId: "org-B" }
    view.rerender(value.view)
    const intermediate = state.clients.at(-1)!
    state.auth = { ...state.auth, orgId: "org-C" }
    view.rerender(value.view)
    const current = state.clients.at(-1)!
    expect(intermediate.close).toHaveBeenCalled()
    act(() => current.confirm(true))
    act(() => current.publish({ team: "Team C" }))
    await screen.findByText("Team C")

    act(() => {
      previous.publish({ team: "late Team A" })
      intermediate.confirm(true)
      intermediate.publish({ team: "late Team B" })
    })
    await act(async () => {})
    expect(screen.queryByText("late Team A")).toBeNull()
    expect(screen.queryByText("late Team B")).toBeNull()
    expect(value.client.getQueryData(query.queryKey)).toEqual({ team: "Team C" })
  })

  it("keeps public SSR data through hydration and StrictMode without replacing the client", () => {
    state.auth = { ...state.auth, isLoaded: false, isSignedIn: false }
    const value = fixture(true, true)
    value.client.setQueryData(publicQuery.queryKey, { team: "Public setup" })
    const container = document.createElement("div")
    container.innerHTML = renderToString(value.view)
    const view = render(value.view, { container, hydrate: true })
    value.unmount = view.unmount

    expect(container).toHaveTextContent("Public setup")
    expect(state.clients).toHaveLength(1)
    expect(state.clients[0].close).not.toHaveBeenCalled()
  })

  it("keeps the real root document, metadata and boot scripts during signed-in SSR", async () => {
    const value = fixture()
    const page = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      component: PrivatePage,
      scripts: () => [{ src: "/_build/test-client.js", type: "module" }],
    })
    const router = createRouter({
      routeTree: rootRoute.addChildren([page]),
      history: createMemoryHistory({ initialEntries: ["/"] }),
      context: { queryClient: value.client },
      isServer: true,
    })
    await router.load()
    const html = renderToString(
      <QueryClientProvider client={value.client}>
        <ConvexIdentityBoundary queryClient={value.client} initialClient={value.convex} useConvexClerkAuth={useTestAuth}>
          <RouterProvider router={router} />
        </ConvexIdentityBoundary>
      </QueryClientProvider>
    )

    expect(html).toContain('<html lang="en">')
    expect(html).toContain("<head>")
    expect(html).toContain("<title>eUsage</title>")
    expect(html).toContain("<body>")
    expect(html).toContain('src="/_build/test-client.js"')
    expect(html).toContain("Loading workspace")
    expect(value.client.getQueryData(query.queryKey)).toBeUndefined()
  })
})
