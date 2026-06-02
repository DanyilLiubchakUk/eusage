import { invoke } from "@tauri-apps/api/core"

export async function saveTeamToken(token: string): Promise<void> {
  await invoke("save_team_token", { token })
}

export async function readTeamToken(): Promise<string | null> {
  return invoke<string | null>("read_team_token")
}

export async function deleteTeamToken(): Promise<void> {
  await invoke("delete_team_token")
}
