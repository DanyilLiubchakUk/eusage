import { z } from "zod"
import { parseTeamConnectionString } from "@/lib/team-connection"
import { DEVICE_NAME_MAX_LENGTH } from "@/lib/team-device-name"

export const TEAM_CONNECTION_STRING_MAX_LENGTH = 512
export const DEVICE_NAME_FORM_MAX_LENGTH = DEVICE_NAME_MAX_LENGTH

export const teamConnectionFormSchema = z.object({
  connectionString: z.string()
    .trim()
    .min(1, "Connection string is required.")
    .max(TEAM_CONNECTION_STRING_MAX_LENGTH, "Use 512 characters or fewer.")
    .superRefine((value, context) => {
      const parsed = parseTeamConnectionString(value)
      if (!parsed.ok) {
        context.addIssue({ code: "custom", message: parsed.message })
      }
    }),
})

export const teamDeviceNameFormSchema = z.object({
  deviceName: z.string()
    .trim()
    .min(1, "Device name is required.")
    .max(DEVICE_NAME_FORM_MAX_LENGTH, "Use 80 characters or fewer."),
})

export type TeamConnectionFormInput = z.infer<typeof teamConnectionFormSchema>
export type TeamDeviceNameFormInput = z.infer<typeof teamDeviceNameFormSchema>

export function teamFormError<T>(error: z.ZodError<T>) {
  return error.issues[0]?.message ?? "Check the form."
}
