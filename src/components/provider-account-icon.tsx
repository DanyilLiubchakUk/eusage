export function ProviderAccountIcon({ iconUrl }: { iconUrl?: string }) {
  if (!iconUrl) {
    return <span className="size-5 shrink-0 rounded-sm bg-foreground/10" aria-hidden />
  }

  return (
    <span
      className="size-5 shrink-0 bg-foreground"
      aria-hidden
      style={{
        WebkitMaskImage: `url(${iconUrl})`,
        WebkitMaskPosition: "center",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskImage: `url(${iconUrl})`,
        maskPosition: "center",
        maskRepeat: "no-repeat",
        maskSize: "contain",
      }}
    />
  )
}
