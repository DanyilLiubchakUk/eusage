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
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react"
import { AdminDateRangeControls } from "./admin-date-range-controls"
import {
  normalizeTvSlideConfigs,
  parseTvSlideDuration,
  type TvDashboardModel,
  type TvSettingsPatch,
  type TvSlideSetting,
} from "./tv-dashboard-data"

type TvSettingsPanelProps = {
  model: TvDashboardModel
  onSettingsChange?: (patch: TvSettingsPatch) => Promise<void> | void
}

export function TvSettingsPanel({ model, onSettingsChange }: TvSettingsPanelProps) {
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
    saveSlides(
      model.slideSettings.map((slide) =>
        slide.id === slideId ? { ...slide, enabled: !slide.enabled } : slide
      )
    )
  }

  function changeDuration(slideId: string, value: string) {
    const durationSeconds = parseTvSlideDuration(value)
    if (durationSeconds === null) {
      setStatus("Duration must be 1-300 seconds")
      return
    }
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

  return (
    <details className="tv-settings-panel">
      <summary>TV settings</summary>
      <div className="tv-settings-body">
        <AdminDateRangeControls
          value={model.dateRange}
          onChange={(dateRange) => save({ dateRange })}
        />
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
          <SortableContext items={slideIds} strategy={verticalListSortingStrategy}>
            <div className="tv-slide-settings-list">
              {model.slideSettings.map((slide, index) => (
                <TvSlideSettingsRow
                  key={slide.id}
                  slide={slide}
                  disabled={!onSettingsChange || isSaving}
                  isFirst={index === 0}
                  isLast={index === model.slideSettings.length - 1}
                  onToggle={() => toggleSlide(slide.id)}
                  onDurationChange={(value) => changeDuration(slide.id, value)}
                  onMoveUp={() => moveSlide(slide.id, -1)}
                  onMoveDown={() => moveSlide(slide.id, 1)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        {status ? <p className="tv-settings-status">{status}</p> : null}
      </div>
    </details>
  )
}

function TvSlideSettingsRow({
  slide,
  disabled,
  isFirst,
  isLast,
  onToggle,
  onDurationChange,
  onMoveUp,
  onMoveDown,
}: {
  slide: TvSlideSetting
  disabled: boolean
  isFirst: boolean
  isLast: boolean
  onToggle: () => void
  onDurationChange: (value: string) => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const sortable = useSortable({ id: slide.id })
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  }

  return (
    <div ref={sortable.setNodeRef} style={style} className="tv-slide-settings-row">
      <button
        type="button"
        aria-label={`Drag ${slide.title}`}
        disabled={disabled}
        {...sortable.attributes}
        {...sortable.listeners}
      >
        <GripVertical size={16} />
      </button>
      <label>
        <input type="checkbox" checked={slide.enabled} disabled={disabled} onChange={onToggle} />
        <span>{slide.title}</span>
      </label>
      <input
        aria-label={`${slide.title} duration seconds`}
        type="number"
        min="1"
        max="300"
        step="1"
        value={slide.durationSeconds}
        disabled={disabled}
        onChange={(event) => onDurationChange(event.target.value)}
      />
      <button
        type="button"
        aria-label={`Move ${slide.title} up`}
        disabled={disabled || isFirst}
        onClick={onMoveUp}
      >
        <ArrowUp size={16} />
      </button>
      <button
        type="button"
        aria-label={`Move ${slide.title} down`}
        disabled={disabled || isLast}
        onClick={onMoveDown}
      >
        <ArrowDown size={16} />
      </button>
    </div>
  )
}
