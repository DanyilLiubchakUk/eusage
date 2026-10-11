import { ClerkProvider } from "@clerk/tanstack-react-start"
import { useMemo, type ReactNode } from "react"
import { clerkAppearance } from "../../lib/clerk-appearance"
import { useEusageTheme } from "../../lib/use-eusage-theme"

export function EusageClerkProvider({ children }: { children: ReactNode }) {
  const theme = useEusageTheme()
  const appearance = useMemo(() => clerkAppearance(theme), [theme])

  return <ClerkProvider appearance={appearance}>{children}</ClerkProvider>
}
