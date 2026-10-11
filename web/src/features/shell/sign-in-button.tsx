import { SignInButton as ClerkSignInButton } from "@clerk/tanstack-react-start"
import { Button } from "@/components/ui/button"

type SignInButtonProps = {
  label?: string
}

export function SignInButton({ label = "Sign in" }: SignInButtonProps) {
  return (
    <ClerkSignInButton mode="modal">
      <Button type="button">{label}</Button>
    </ClerkSignInButton>
  )
}
