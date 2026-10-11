/**
 * Brand mark shared across the app shell and landing page.
 * Keep in sync with the logo rendered by `app-nav.tsx`.
 */
export function BrandLogo({ className = "block size-full" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      className={className}
    >
      <rect width="64" height="64" rx="14" fill="var(--brand-logo-bg)" />
      <circle cx="32" cy="32" r="20" fill="var(--brand-logo-mark)" />
      <path
        d="M18 35c0-8 6-14 14-14 7 0 13 5 14 12H26c1 4 4 7 9 7 3 0 6-1 8-3l4 5c-3 3-7 5-12 5-10 0-17-5-17-12zm9-6h11c-1-2-3-4-6-4s-5 1-5 4z"
        fill="var(--brand-logo-glyph)"
      />
    </svg>
  )
}

/**
 * Wordmark + logo lockup, matching the AppNav brand link styling.
 */
export function BrandLockup({
  to = "/",
  className = "",
}: {
  to?: string
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-[0.95rem] font-semibold tracking-tight text-foreground no-underline ${className}`}
    >
      <span
        className="block size-7 overflow-hidden rounded-[9px] ring-1 ring-[var(--surface-hairline)]"
        aria-hidden="true"
      >
        <BrandLogo />
      </span>
      <span>eUsage</span>
    </span>
  )
}
