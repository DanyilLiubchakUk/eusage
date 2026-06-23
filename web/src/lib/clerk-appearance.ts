import type { Appearance } from "@clerk/types"
import type { Theme } from "./theme"

const LIGHT = {
  primary: "#0f766e",
  background: "#ffffff",
  foreground: "#0a0a0a",
  card: "#ffffff",
  muted: "#f4f4f4",
  mutedForeground: "#525252",
  border: "#e5e5e5",
  destructive: "#d92d20",
} as const

const DARK = {
  primary: "#9ad0b0",
  background: "#000000",
  foreground: "#ededed",
  card: "#0a0a0a",
  muted: "#141414",
  mutedForeground: "#a1a1a1",
  border: "rgba(255, 255, 255, 0.12)",
  destructive: "#f87171",
} as const

const hiddenFooter = { display: "none" } as const

const modalElements: Appearance["elements"] = {
  modalContent: {
    height: "auto",
    overflow: "visible",
  },
  main: {
    minHeight: "unset",
    height: "auto",
    background: "var(--card)",
  },
  pageScrollBox: {
    minHeight: "unset",
    height: "auto",
    overflow: "visible",
  },
  formFieldFeedback: {
    position: "absolute",
  },
}

const hiddenFooterElements: Appearance["elements"] = {
  footer: hiddenFooter,
  footerPages: hiddenFooter,
  footerAction: hiddenFooter,
  footerActionLink: hiddenFooter,
  userButtonPopoverFooter: hiddenFooter,
  organizationSwitcherPopoverFooter: hiddenFooter,
}

const modalAppearanceElements: Appearance["elements"] = {
  ...modalElements,
  ...hiddenFooterElements,
}

function clerkVariables(theme: Theme): Appearance["variables"] {
  const palette = theme === "dark" ? DARK : LIGHT

  return {
    colorPrimary: palette.primary,
    colorDanger: palette.destructive,
    colorSuccess: palette.primary,
    colorWarning: "#f0b252",
    colorNeutral: palette.mutedForeground,
    colorForeground: palette.foreground,
    colorBackground: palette.background,
    colorInputForeground: palette.foreground,
    colorInputBackground: palette.background,
    colorText: palette.foreground,
    colorTextSecondary: palette.mutedForeground,
    colorMuted: palette.muted,
    colorMutedForeground: palette.mutedForeground,
    colorModalBackdrop: "rgba(0, 0, 0, 0.55)",
    borderRadius: "0.625rem",
    fontFamily:
      '"Geist", "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontFamilyButtons:
      '"Geist", "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: "0.875rem",
    spacingUnit: "0.875rem",
  }
}

function clerkOptions(): Appearance["options"] {
  return {
    socialButtonsPlacement: "bottom",
    shimmer: false,
    unsafe_disableDevelopmentModeWarnings: true,
  }
}

/** Global ClerkProvider appearance — modals (sign-in, create org) + footer suppression. */
export function clerkAppearance(theme: Theme): Appearance {
  return {
    variables: clerkVariables(theme),
    elements: modalAppearanceElements,
    layout: {
      unsafe_disableDevelopmentModeWarnings: true,
    },
    options: clerkOptions(),
  }
}

/** Popovers: org switcher + user menu — footers only, no modal sizing rules. */
export function clerkPopoverAppearance(theme: Theme): Appearance {
  return {
    variables: clerkVariables(theme),
    elements: hiddenFooterElements,
    layout: {
      unsafe_disableDevelopmentModeWarnings: true,
    },
    options: clerkOptions(),
  }
}
