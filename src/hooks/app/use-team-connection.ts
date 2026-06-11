import { useCallback, useEffect, useState } from "react"
import {
  connectTeam,
  disconnectTeam,
  loadTeamConnection,
  refreshTeamCheckIn,
  updateTeamDeviceNameOverride,
} from "@/lib/team-connection-actions"
import type { TeamConnectionSettings } from "@/lib/team-settings"

export type TeamConnectionViewStatus =
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

let cachedState: TeamConnectionViewState | null = null

export function useTeamConnection() {
  const [state, setState] = useState<TeamConnectionViewState>(() => cachedState ?? initialState)

  const setCachedState = useCallback((nextState: TeamConnectionViewState) => {
    cachedState = nextState
    setState(nextState)
  }, [])

  useEffect(() => {
    let isMounted = true

    loadTeamConnection()
      .then((result) => {
        if (!isMounted) return
        setCachedState({
          status: result.status,
          connection: result.connection,
          message: result.message,
        })
      })
      .catch((error) => {
        console.error("Failed to load team connection:", error)
        if (isMounted) {
          setState((current) => {
            const nextState: TeamConnectionViewState = {
              status: "error",
              connection: current.connection,
              message: "Failed to load team connection.",
            }
            cachedState = nextState
            return nextState
          })
        }
      })

    return () => {
      isMounted = false
    }
  }, [setCachedState])

  const connect = useCallback(async (connectionString: string) => {
    setState((current) => ({
      ...current,
      status: "connecting",
      message: null,
    }))

    try {
      const result = await connectTeam(connectionString)
      setCachedState({
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
  }, [setCachedState])

  const checkIn = useCallback(async () => {
    setState((current) => ({
      ...current,
      status: "checking",
      message: null,
    }))

    try {
      const result = await refreshTeamCheckIn()
      setCachedState({
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
  }, [setCachedState])

  const disconnect = useCallback(async () => {
    setState((current) => ({
      ...current,
      status: "disconnecting",
      message: null,
    }))

    try {
      const result = await disconnectTeam()
      setCachedState({
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
  }, [setCachedState])

  const updateDeviceName = useCallback(async (deviceNameOverride: string | null) => {
    setState((current) => ({
      ...current,
      status: "checking",
      message: null,
    }))

    try {
      const result = await updateTeamDeviceNameOverride(deviceNameOverride)
      setCachedState({
        status: result.ok ? "connected" : result.connection ? "error" : "invalid",
        connection: result.connection,
        message: result.message,
      })
      return result
    } catch (error) {
      console.error("Failed to update team device name:", error)
      const message = "Failed to update device name."
      setState((current) => ({
        status: "error",
        connection: current.connection,
        message,
      }))
      return { ok: false as const, code: "settings-error" as const, message, connection: null }
    }
  }, [setCachedState])

  return {
    state,
    connect,
    checkIn,
    disconnect,
    updateDeviceName,
  }
}
