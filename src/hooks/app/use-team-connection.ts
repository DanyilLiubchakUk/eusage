import { useCallback, useEffect, useState } from "react"
import {
  connectTeam,
  disconnectTeam,
  loadTeamConnection,
  refreshTeamCheckIn,
} from "@/lib/team-connection-actions"
import type { TeamConnectionSettings } from "@/lib/team-settings"

type TeamConnectionViewStatus =
  | "loading"
  | "disconnected"
  | "connected"
  | "connecting"
  | "disconnecting"
  | "checking"
  | "error"
  | "invalid"

export type TeamConnectionViewState = {
  status: TeamConnectionViewStatus
  connection: TeamConnectionSettings | null
  message: string | null
}

const initialState: TeamConnectionViewState = {
  status: "loading",
  connection: null,
  message: null,
}

export function useTeamConnection() {
  const [state, setState] = useState<TeamConnectionViewState>(initialState)

  useEffect(() => {
    let isMounted = true

    loadTeamConnection()
      .then((result) => {
        if (!isMounted) return
        setState({
          status: result.status,
          connection: result.connection,
          message: result.message,
        })
      })
      .catch((error) => {
        console.error("Failed to load team connection:", error)
        if (isMounted) {
          setState({
            status: "error",
            connection: null,
            message: "Failed to load team connection.",
          })
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const connect = useCallback(async (connectionString: string) => {
    setState((current) => ({
      ...current,
      status: "connecting",
      message: null,
    }))

    try {
      const result = await connectTeam(connectionString)
      setState({
        status: result.ok ? "connected" : result.connection ? "error" : "disconnected",
        connection: result.connection,
        message: result.message,
      })
      return result
    } catch (error) {
      console.error("Failed to connect team:", error)
      const message = "Failed to connect team."
      setState((current) => ({
        status: "error",
        connection: current.connection,
        message,
      }))
      return { ok: false as const, code: "network-error" as const, message, connection: null }
    }
  }, [])

  const checkIn = useCallback(async () => {
    setState((current) => ({
      ...current,
      status: "checking",
      message: null,
    }))

    try {
      const result = await refreshTeamCheckIn()
      setState({
        status: result.ok ? "connected" : result.connection ? "error" : "invalid",
        connection: result.connection,
        message: result.message,
      })
      return result
    } catch (error) {
      console.error("Failed to check in team device:", error)
      const message = "Failed to check in team device."
      setState((current) => ({
        status: "error",
        connection: current.connection,
        message,
      }))
      return { ok: false as const, code: "network-error" as const, message, connection: null }
    }
  }, [])

  const disconnect = useCallback(async () => {
    setState((current) => ({
      ...current,
      status: "disconnecting",
      message: null,
    }))

    try {
      const result = await disconnectTeam()
      setState({
        status: result.ok ? "disconnected" : "error",
        connection: result.connection,
        message: result.message,
      })
      return result
    } catch (error) {
      console.error("Failed to disconnect team:", error)
      const message = "Failed to disconnect team."
      setState((current) => ({
        status: "error",
        connection: current.connection,
        message,
      }))
      return { ok: false as const, code: "credential-error" as const, message, connection: null }
    }
  }, [])

  return {
    state,
    connect,
    checkIn,
    disconnect,
  }
}
