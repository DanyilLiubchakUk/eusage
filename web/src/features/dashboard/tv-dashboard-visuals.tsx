import { cn } from "@/lib/utils"
import { PoolShapeFigure } from "./cursor-pool-shape"

type TrendPoint = {
  day: string
  value: number
}

type Tone = "amber" | "cyan" | "green" | "red" | "neutral"

export function TvSignalStrip({ items }: { items: Array<[string, string]> }) {
  return (
    <section
      className="grid w-full grid-cols-4 gap-[clamp(0.5rem,1vw,1rem)] max-lg:grid-cols-2 max-sm:grid-cols-1"
      aria-label="Summary metrics"
    >
      {items.map(([label, value], index) => (
        <div
          key={label}
          className={cn(
            tvPanelClass,
            "min-h-[clamp(6rem,9vh,10rem)] content-center border-l-[0.45rem]",
            index > 2 ? "max-2xl:hidden" : "",
            index > 1 ? "max-xl:hidden" : "",
            index > 0 ? "max-md:hidden" : ""
          )}
          style={{ borderLeftColor: signalColors[index % signalColors.length] }}
        >
          <span className={tvLabelClass}>{label}</span>
          <strong className="min-w-0 break-words text-[clamp(1.75rem,2.45vw,4.4rem)] font-black leading-[0.98] text-[#eef8f1]">
            {value}
          </strong>
        </div>
      ))}
    </section>
  )
}

export function TvMetricRail({
  rows,
}: {
  rows: Array<{ metric: string; value: string; source: string; status: string }>
}) {
  return (
    <section
      className="grid w-full grid-cols-4 gap-[clamp(0.6rem,1vw,1.1rem)] max-xl:grid-cols-2 max-md:grid-cols-1"
      aria-label="Available metrics"
    >
      {rows.slice(0, 4).map((row, index) => (
        <div
          key={row.metric}
          className={cn(
            tvPanelClass,
            "min-h-[clamp(6rem,9vh,10rem)] content-between",
            index > 2 ? "max-2xl:hidden" : "",
            index > 1 ? "max-xl:hidden" : "",
            index > 0 ? "max-md:hidden" : ""
          )}
        >
          <span className={tvLabelClass}>{row.metric}</span>
          <strong className="min-w-0 break-words text-[clamp(1.65rem,2.25vw,4rem)] font-black leading-[0.98] text-[#eef8f1]">
            {row.value}
          </strong>
          <span className="min-w-0 truncate text-[clamp(1rem,1.15vw,1.7rem)] font-bold text-[#b7dac4] max-lg:hidden">
            {row.source} / {row.status}
          </span>
        </div>
      ))}
    </section>
  )
}

export function TvSparkPanel({
  title,
  primary,
  secondary,
  points,
  tone = "amber",
  emptyLabel,
}: {
  title: string
  primary: string
  secondary: string
  points: TrendPoint[]
  tone?: Tone
  emptyLabel: string
}) {
  const hasPoints = points.length > 0

  return (
    <section
      className={cn(tvPanelClass, "min-h-0 overflow-hidden")}
      aria-label={title}
    >
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="grid min-w-0 gap-2">
          <span className={tvLabelClass}>{title}</span>
          <strong className="min-w-0 break-words text-[clamp(2rem,3.1vw,6rem)] font-black leading-none text-[#eef8f1]">
            {hasPoints ? primary : emptyLabel}
          </strong>
        </div>
        <span className={cn("shrink-0 rounded-full px-4 py-1.5 text-[clamp(0.9rem,1vw,1.5rem)] font-black uppercase max-lg:hidden", tonePillClass[tone])}>
          live
        </span>
      </div>
      <div className="min-h-0 flex-1">
        {hasPoints ? <TvSparkline points={points} tone={tone} /> : <TvEmptyState>{emptyLabel}</TvEmptyState>}
      </div>
      <p className="m-0 min-w-0 truncate text-[clamp(1.05rem,1.25vw,2rem)] font-bold text-[#cdebd8]">
        {secondary}
      </p>
    </section>
  )
}

export function TvSparkline({ points, tone = "amber" }: { points: TrendPoint[]; tone?: Tone }) {
  const values = points.map((point) => point.value).filter(Number.isFinite)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const path = values
    .map((value, index) => {
      const x = values.length === 1 ? 100 : (index / (values.length - 1)) * 100
      const y = 92 - ((value - min) / range) * 78
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(" ")
  const area = path ? `${path} L 100 100 L 0 100 Z` : ""

  return (
    <svg className="h-full min-h-[10rem] w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d={area} fill={toneColor[tone]} opacity="0.16" />
      <path d={path} fill="none" stroke={toneColor[tone]} strokeLinecap="round" strokeLinejoin="round" strokeWidth="4.5" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function TvBarList({
  rows,
  ariaLabel,
  emptyLabel,
}: {
  rows: Array<{
    id: string
    label: string
    value: number
    displayValue: string
    meta?: string
    metaLines?: string[]
    tone?: Tone
  }>
  ariaLabel: string
  emptyLabel: string
}) {
  const max = Math.max(...rows.map((row) => row.value), 0)

  if (rows.length === 0) return <TvEmptyState>{emptyLabel}</TvEmptyState>

  return (
    <section className="grid gap-[clamp(0.55rem,1vw,1.1rem)]" aria-label={ariaLabel}>
      {rows.map((row, index) => {
        const percent = max > 0 ? Math.max(4, Math.min(100, (row.value / max) * 100)) : 0
        const tone = row.tone ?? toneOrder[index % toneOrder.length]

        return (
          <div
            key={row.id}
            className={cn(
              "grid gap-2",
              index > 3 ? "max-[2300px]:hidden" : "",
              index > 2 ? "max-2xl:hidden" : "",
              index > 1 ? "max-lg:hidden" : ""
            )}
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
              <div className="min-w-0">
                <strong className="block truncate text-[clamp(1.7rem,2.15vw,4rem)] font-black leading-tight text-[#eef8f1]">
                  {row.label}
                </strong>
                <TvBarMeta meta={row.meta} metaLines={row.metaLines} />
              </div>
              <span className="text-right text-[clamp(1.55rem,1.9vw,3.5rem)] font-black text-[#eef8f1]">
                {row.displayValue}
              </span>
            </div>
            <div className="h-[clamp(1.05rem,1.45vh,1.9rem)] overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{ width: `${percent}%`, backgroundColor: toneColor[tone] }}
              />
            </div>
          </div>
        )
      })}
    </section>
  )
}

function TvBarMeta({
  meta,
  metaLines,
}: {
  meta?: string
  metaLines?: string[]
}) {
  const lines = metaLines?.length ? metaLines : meta ? [meta] : []
  if (lines.length === 0) return null

  return (
    <span className="block min-w-0 max-lg:hidden">
      {lines.slice(0, 2).map((line) => (
        <span
          key={line}
          className="block truncate text-[clamp(1rem,1.12vw,1.8rem)] font-bold leading-tight text-[#b7dac4]"
        >
          {line}
        </span>
      ))}
    </span>
  )
}

export function TvReservoir({
  label,
  usedPercent,
  ratioLabel,
}: {
  label: string
  usedPercent: number
  ratioLabel: string
}) {
  const drainedPercent = Math.max(0, Math.min(100, usedPercent))

  return (
    <section
      className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-[clamp(1rem,1.8vw,3rem)] overflow-visible"
      aria-label={label}
    >
      <PoolShapeFigure
        usedPercent={drainedPercent}
        title={label}
        className="h-full"
      />
      <div className={cn(tvPanelClass, "content-center gap-[clamp(0.35rem,0.8vw,1rem)] text-center")}>
        <span className={tvLabelClass}>{label}</span>
        <strong className="min-w-0 break-words text-[clamp(2.6rem,5vw,9rem)] font-black leading-none text-[#eef8f1]">
          {ratioLabel}
        </strong>
        <span className="min-w-0 text-[clamp(1.7rem,2.5vw,4.8rem)] font-black leading-tight text-[#cdebd8]">
          {Math.round(drainedPercent)}% used
        </span>
      </div>
    </section>
  )
}

export function TvDataRows({
  rows,
  ariaLabel,
  emptyLabel,
}: {
  rows: Array<{ id: string; label: string; value: string; meta?: string; tone?: Tone }>
  ariaLabel: string
  emptyLabel: string
}) {
  if (rows.length === 0) return <TvEmptyState>{emptyLabel}</TvEmptyState>

  return (
    <section className="grid gap-[clamp(0.5rem,0.85vw,0.9rem)]" aria-label={ariaLabel}>
      {rows.slice(0, 5).map((row, index) => (
        <div
          key={row.id}
          className={cn(
            "grid min-h-[clamp(5rem,7.4vh,8.5rem)] grid-cols-[minmax(0,1fr)_auto] items-center gap-5 border-b border-[#9ad0b0]/12 py-[clamp(0.55rem,0.85vw,1rem)] last:border-b-0 max-md:grid-cols-1",
            index > 3 ? "max-[2300px]:hidden" : "",
            index > 2 ? "max-2xl:hidden" : "",
            index > 1 ? "max-lg:hidden" : ""
          )}
        >
          <div className="min-w-0">
            <strong className="block truncate text-[clamp(1.55rem,1.9vw,3.5rem)] font-black text-[#eef8f1]">
              {row.label}
            </strong>
            {row.meta ? (
              <span className="block truncate text-[clamp(0.95rem,1.05vw,1.65rem)] font-bold text-[#b7dac4] max-lg:hidden">
                {row.meta}
              </span>
            ) : null}
          </div>
          <span
            className={cn(
              "justify-self-end rounded-full px-5 py-3 text-[clamp(1.15rem,1.25vw,2.1rem)] font-black uppercase text-[#060708]",
              row.tone ? tonePillClass[row.tone] : tonePillClass.neutral
            )}
          >
            {row.value}
          </span>
        </div>
      ))}
    </section>
  )
}

export function TvEmptyState({ children }: { children: string }) {
  return (
    <p className="m-0 grid min-h-[clamp(8rem,15vh,16rem)] place-items-center rounded-xl border border-dashed border-[#9ad0b0]/25 bg-[#9ad0b0]/[0.05] px-6 text-center text-[clamp(1.8rem,2.2vw,4rem)] font-black text-[#cdebd8]">
      {children}
    </p>
  )
}

export function TvQuietNote({ children }: { children: string }) {
  return (
    <p className="m-0 w-fit max-w-full rounded-full border border-[#9ad0b0]/18 bg-[#9ad0b0]/[0.07] px-[clamp(1rem,1.2vw,1.8rem)] py-[clamp(0.65rem,0.8vw,1rem)] text-[clamp(1.1rem,1.2vw,2rem)] font-black uppercase tracking-wide text-[#cdebd8]">
      {children}
    </p>
  )
}

const tvPanelClass =
  "grid min-w-0 rounded-xl border border-[#9ad0b0]/18 bg-[#07120f]/[0.84] p-[clamp(1rem,1.25vw,2rem)] shadow-[inset_0_1px_0_rgba(154,208,176,0.1),0_1.4rem_4rem_rgba(0,0,0,0.24)]"

const tvLabelClass =
  "min-w-0 truncate text-[clamp(1rem,1.05vw,1.6rem)] font-black uppercase tracking-wide text-[#9ad0b0]"

const signalColors = ["#9ad0b0", "#5f9275", "#cdebd8", "#f0b252"]
const toneOrder: Tone[] = ["green", "cyan", "amber", "red"]
const toneColor: Record<Tone, string> = {
  amber: "#f0b252",
  cyan: "#6fbf93",
  green: "#9ad0b0",
  red: "#ff6b6b",
  neutral: "#cdebd8",
}

const tonePillClass: Record<Tone, string> = {
  amber: "bg-[#f0b252] text-[#06100c]",
  cyan: "bg-[#6fbf93] text-[#06100c]",
  green: "bg-[#9ad0b0] text-[#06100c]",
  red: "bg-[#ff6b6b] text-[#060708]",
  neutral: "bg-[#cdebd8] text-[#06100c]",
}
