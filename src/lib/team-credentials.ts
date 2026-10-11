import { invoke } from "@tauri-apps/api/core"

export async function readTeamToken(): Promise<string | null> {
  return invoke<string | null>("read_team_token")
}
