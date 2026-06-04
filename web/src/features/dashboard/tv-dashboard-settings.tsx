import { useMemo, useState } from "react"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ArrowDown, ArrowUp, Ban, Copy, ExternalLink, GripVertical, Link2, RotateCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AdminDateRangeControls } from "./admin-date-range-controls"
import {
  normalizeTvSlideConfigs,
  type TvDashboardModel,
  type TvSettingsPatch,
  type TvSlideSetting,
} from "./tv-dashboard-data"
import { TvSlideDurationInput } from "./tv-slide-duration-input"

export type TvDisplayLinkControls = {
  link: {
    fingerprint: string
    status: string
    createdAt: number
    rotatedAt: number | null
    revokedAt: number | null
  } | null
  rawToken: string | null
  displayUrl: string | null
  onCreate: () => Promise<void>
  onRotate: () => Promise<void>
  onRevoke: () => Promise<void>
}

type TvSettingsPanelProps = {
  model: TvDashboardModel
  onSettingsChange?: (patch: TvSettingsPatch) => Promise<void> | void
  displayLinkControls?: TvDisplayLinkControls
}

export function TvSettingsPanel({
  model,
  onSettingsChange,
  displayLinkControls,
}: TvSettingsPanelProps) {
  const [status, setStatus] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function save(patch: TvSettingsPatch) {
    if (!onSettingsChange) return
    setIsSaving(true)
    setStatus(null)
    try {
      await onSettingsChange(patch)
      setStatus("Saved")
    } catch (error) {
      console.error(error)
      setStatus("Save failed")
    } finally {
      setIsSaving(false)
    }
  }

  function saveSlides(slides: TvSlideSetting[]) {
    void save({ slides: normalizeTvSlideConfigs(slides) })
  }

  function toggleSlide(slideId: string) {
    const enabledCount = model.slideSettings.filter((slide) => slide.enabled).length
    saveSlides(
      model.slideSettings.map((slide) =>
        slide.id === slideId && (enabledCount > 1 || !slide.enabled)
          ? { ...slide, enabled: !slide.enabled }
          : slide
      )
    )
  }

  function commitDuration(slideId: string, durationSeconds: number) {
    saveSlides(
      model.slideSettings.map((slide) =>
        slide.id === slideId ? { ...slide, durationSeconds } : slide
      )
    )
  }

  function moveSlide(slideId: string, direction: -1 | 1) {
    const current = model.slideSettings.findIndex((slide) => slide.id === slideId)
    const target = current + direction
    if (current < 0 || target < 0 || target >= model.slideSettings.length) return
    saveSlides(arrayMove(model.slideSettings, current, target))
  }

  function dragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : null
    if (!overId || activeId === overId) return

    const oldIndex = model.slideSettings.findIndex((slide) => slide.id === activeId)
    const newIndex = model.slideSettings.findIndex((slide) => slide.id === overId)
    if (oldIndex < 0 || newIndex < 0) return
    saveSlides(arrayMove(model.slideSettings, oldIndex, newIndex))
  }

  const slideIds = useMemo(() => model.slideSettings.map((slide) => slide.id), [model.slideSettings])
  const enabledCount = model.slideSettings.filter((slide) => slide.enabled).length

  return (
    <details className="fixed bottom-4 left-4 z-10 w-[min(48rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-white/20 bg-[#07120f]/85 text-white opacity-90 shadow-[0_24px_80px_rgba(0,0,0,0.48)] backdrop-blur-xl transition-opacity hover:opacity-100 focus-within:opacity-100 open:opacity-100 max-md:bottom-16 max-md:left-3 max-md:w-[calc(100vw-1.5rem)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 border-b border-white/10 px-4 py-3 font-extrabold [&::-webkit-details-marker]:hidden">
        <span>TV settings</span>
        <Badge className="border-white/15 bg-white/10 text-[#c0d0c7]" variant="outline">
          {enabledCount}/{model.slideSettings.length} on
        </Badge>
      </summary>
      <div className="grid max-h-[min(38rem,calc(100vh-7rem))] gap-3 overflow-y-auto px-4 pb-4 pt-3">
        <section className={tvSettingsSectionClass}>
          <div className={tvSettingsSectionHeaderClass}>
            <strong>Time range</strong>
            <Badge className="border-white/15 bg-white/10 text-[#c0d0c7]" variant="outline">
              {model.rangeLabel}
            </Badge>
          </div>
          <AdminDateRangeControls
            value={model.dateRange}
            bounds={model.dateBounds}
            variant="tv"
            onChange={(dateRange) => save({ dateRange })}
          />
        </section>
        <section className={tvSettingsSectionClass}>
          <div className={tvSettingsSectionHeaderClass}>
            <strong>Slides</strong>
            <p className="m-0 min-h-5 text-xs font-bold text-[#c0d0c7]" aria-live="polite">
              {isSaving ? "Saving" : status ?? "\u00a0"}
            </p>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
            <SortableContext items={slideIds} strategy={verticalListSortingStrategy}>
              <div className="grid gap-2">
                {model.slideSettings.map((slide, index) => (
                  <TvSlideSettingsRow
                    key={slide.id}
                    slide={slide}
                    disabled={!onSettingsChange || isSaving}
                    isFirst={index === 0}
                    isLast={index === model.slideSettings.length - 1}
                    isLastEnabled={slide.enabled && enabledCount === 1}
                    onToggle={() => toggleSlide(slide.id)}
                    onDurationCommit={(value) => commitDuration(slide.id, value)}
                    onMoveUp={() => moveSlide(slide.id, -1)}
                    onMoveDown={() => moveSlide(slide.id, 1)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>
        {displayLinkControls ? <TvDisplayLinkPanel controls={displayLinkControls} /> : null}
      </div>
    </details>
  )
}

function TvSlideSettingsRow({
  slide,
  disabled,
  isFirst,
  isLast,
  isLastEnabled,
  onToggle,
  onDurationCommit,
  onMoveUp,
  onMoveDown,
}: {
  slide: TvSlideSetting
  disabled: boolean
  isFirst: boolean
  isLast: boolean
  isLastEnabled: boolean
  onToggle: () => void
  onDurationCommit: (value: number) => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const sortable = useSortable({ id: slide.id })
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  }

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className="grid min-h-[4.75rem] grid-cols-[2rem_minmax(0,1fr)_5.75rem_2rem_2rem] items-start gap-2 rounded-lg border border-white/10 bg-white/[0.07] p-2 transition-colors hover:bg-white/[0.1]"
    >
      <Button
        className={tvSettingsIconButtonClass}
        type="button"
        aria-label={`Drag ${slide.title}`}
        disabled={disabled}
        {...sortable.attributes}
        {...sortable.listeners}
      >
        <GripVertical size={16} />
      </Button>
      <label className="inline-flex min-w-0 items-center gap-2 font-bold">
        <input
          className="size-4 accent-[#9ad0b0]"
          type="checkbox"
          checked={slide.enabled}
          disabled={disabled || isLastEnabled}
          onChange={onToggle}
        />
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">{slide.title}</span>
      </label>
      <TvSlideDurationInput
        id={`${slide.id}-duration`}
        label={`${slide.title} duration seconds`}
        value={slide.durationSeconds}
        disabled={disabled}
        onCommit={onDurationCommit}
      />
      <Button
        className={tvSettingsIconButtonClass}
        type="button"
        aria-label={`Move ${slide.title} up`}
        disabled={disabled || isFirst}
        onClick={onMoveUp}
      >
        <ArrowUp size={16} />
      </Button>
      <Button
        className={tvSettingsIconButtonClass}
        type="button"
        aria-label={`Move ${slide.title} down`}
        disabled={disabled || isLast}
        onClick={onMoveDown}
      >
        <ArrowDown size={16} />
      </Button>
    </div>
  )
}

function TvDisplayLinkPanel({ controls }: { controls: TvDisplayLinkControls }) {
  const [status, setStatus] = useState<string | null>(null)

  async function runAction(action: () => Promise<void>, success: string) {
    setStatus(null)
    try {
      await action()
      setStatus(success)
    } catch (error) {
      console.error(error)
      setStatus("TV link action failed")
    }
  }

  async function copyLink() {
    if (!controls.displayUrl) return
    try {
      await navigator.clipboard.writeText(controls.displayUrl)
      setStatus("Copied")
    } catch (error) {
      console.error(error)
      setStatus("Copy failed")
    }
  }

  return (
    <section className={tvSettingsSectionClass} aria-label="TV display link">
      <div className={tvSettingsSectionHeaderClass}>
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-md border border-white/10 bg-white/10">
            <Link2 size={16} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <strong>Display link</strong>
            <p className="m-0 truncate text-xs font-bold text-[#c0d0c7]">
              {controls.link ? controls.link.fingerprint : "No active link"}
            </p>
          </div>
        </div>
        <Badge className="border-white/15 bg-white/10 text-[#c0d0c7]" variant="outline">
          {controls.link ? controls.link.status : "inactive"}
        </Badge>
      </div>
      {controls.rawToken && controls.displayUrl ? (
        <label className="grid gap-2 text-xs font-extrabold uppercase tracking-wide text-[#c0d0c7]">
          <span>New link</span>
          <div className="flex gap-2">
            <Input className={tvSettingsInputClass} readOnly value={controls.displayUrl} />
            <Button className={tvSettingsIconButtonClass} size="icon-sm" type="button" onClick={copyLink} aria-label="Copy TV display link">
              <Copy size={15} aria-hidden="true" />
            </Button>
          </div>
        </label>
      ) : (
        <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm font-bold text-[#c0d0c7]">
          Rotate to show a fresh link here.
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {controls.link ? (
          <>
            <Button
              className={tvSettingsActionButtonClass}
              size="sm"
              type="button"
              onClick={() => runAction(controls.onRotate, "Rotated")}
            >
              <RotateCw size={15} aria-hidden="true" />
              Rotate
            </Button>
            <Button
              className={tvSettingsActionButtonClass}
              size="sm"
              type="button"
              onClick={() => runAction(controls.onRevoke, "Revoked")}
            >
              <Ban size={15} aria-hidden="true" />
              Revoke
            </Button>
          </>
        ) : (
          <Button
            className={tvSettingsActionButtonClass}
            size="sm"
            type="button"
            onClick={() => runAction(controls.onCreate, "Created")}
          >
            <Link2 size={15} aria-hidden="true" />
            Create
          </Button>
        )}
        <Button className={tvSettingsActionButtonClass} size="sm" type="button" disabled={!controls.displayUrl} onClick={copyLink}>
          <Copy size={15} aria-hidden="true" />
          Copy
        </Button>
        {controls.displayUrl ? (
          <a
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: `${tvSettingsActionButtonClass} gap-1.5`,
            })}
            href={controls.displayUrl}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={15} aria-hidden="true" />
            Open
          </a>
        ) : null}
      </div>
      <p className="m-0 min-h-5 text-sm font-bold text-[#c0d0c7]" aria-live="polite">
        {status ?? "\u00a0"}
      </p>
    </section>
  )
}

const tvSettingsSectionClass =
  "grid gap-3 rounded-lg border border-white/10 bg-white/[0.06] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"

const tvSettingsSectionHeaderClass =
  "flex min-h-8 items-center justify-between gap-3 text-sm"

const tvSettingsInputClass =
  "border-white/20 bg-black/30 font-mono text-sm normal-case text-white focus-visible:border-[#9ad0b0]/70 focus-visible:ring-[#9ad0b0]/25"

const tvSettingsIconButtonClass =
  "size-8 border-white/20 bg-white/10 p-0 text-white hover:bg-white/20 disabled:opacity-45"

const tvSettingsActionButtonClass =
  "border-white/20 bg-white/10 text-white hover:bg-white/20 disabled:opacity-45"
