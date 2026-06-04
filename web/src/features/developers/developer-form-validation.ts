import { z } from "zod"
import {
  DEVELOPER_EMAIL_MAX_LENGTH,
  DEVELOPER_METADATA_NOTES_MAX_LENGTH,
  DEVELOPER_NAME_MAX_LENGTH,
  DEVELOPER_TOKEN_LABEL_MAX_LENGTH,
} from "../../../../convex/developerTokens"

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export {
  DEVELOPER_EMAIL_MAX_LENGTH,
  DEVELOPER_METADATA_NOTES_MAX_LENGTH,
  DEVELOPER_NAME_MAX_LENGTH,
  DEVELOPER_TOKEN_LABEL_MAX_LENGTH,
}

export const developerFormSchema = z.object({
  displayName: z.string().trim().min(1, "Developer name is required.").max(DEVELOPER_NAME_MAX_LENGTH, "Use 80 characters or fewer."),
  email: z.string().trim().max(DEVELOPER_EMAIL_MAX_LENGTH, "Use 254 characters or fewer.").refine((value) => value === "" || emailPattern.test(value), "Enter a valid email address."),
  tokenLabel: z.string().trim().min(1, "Token label is required.").max(DEVELOPER_TOKEN_LABEL_MAX_LENGTH, "Use 16 characters or fewer."),
  metadataNotes: z.string().trim().max(DEVELOPER_METADATA_NOTES_MAX_LENGTH, "Use 500 characters or fewer."),
})

export type DeveloperFormInput = z.infer<typeof developerFormSchema>
export type DeveloperFormErrors = Partial<Record<keyof DeveloperFormInput, string>>

export function developerFormErrors(error: z.ZodError<DeveloperFormInput>) {
  const errors: DeveloperFormErrors = {}
  for (const issue of error.issues) {
    const field = issue.path[0]
    if (
      field === "displayName" ||
      field === "email" ||
      field === "tokenLabel" ||
      field === "metadataNotes"
    ) {
      errors[field] ??= issue.message
    }
  }
  return errors
}
