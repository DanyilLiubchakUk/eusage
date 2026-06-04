import { useCallback } from "react"
import { CircleHelp, Network, Settings } from "lucide-react"
import { openUrl } from "@tauri-apps/plugin-opener"
import { invoke } from "@tauri-apps/api/core"
import { Menu, MenuItem, PredefinedMenuItem } from "@tauri-apps/api/menu"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

function EUsageLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="112 112 800 800"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="512" cy="524" r="318" strokeWidth="48" />
      <path
        d="M284 552c0-128 96-222 228-222 118 0 211 78 225 195H404c18 68 72 108 151 108 51 0 96-17 132-52l62 78c-51 51-121 77-209 77-155 0-256-74-256-184zm134-92h181c-18-49-51-75-99-75-45 0-75 24-82 75z"
        transform="translate(512 512) scale(0.84) translate(-512 -512)"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  )
}
import { cn } from "@/lib/utils"
import { getRelativeLuminance } from "@/lib/color"
import { useDarkMode } from "@/hooks/use-dark-mode"

type ActiveView = "home" | "settings" | string

type PluginContextAction = "reload" | "remove"

interface NavPlugin {
  id: string
  name: string
  iconUrl: string
  brandColor?: string
}

interface SideNavProps {
  activeView: ActiveView
  onViewChange: (view: ActiveView) => void
  plugins: NavPlugin[]
  onPluginContextAction?: (pluginId: string, action: PluginContextAction) => void
  isPluginRefreshAvailable?: (pluginId: string) => boolean
  onReorder?: (orderedIds: string[]) => void
}

interface NavButtonProps {
  isActive: boolean
  onClick: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  children: React.ReactNode
  "aria-label"?: string
}

function NavButton({ isActive, onClick, onContextMenu, children, "aria-label": ariaLabel }: NavButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={onContextMenu}
      aria-label={ariaLabel}
      className={cn(
        "relative flex items-center justify-center w-full p-2.5 transition-colors",
        "hover:bg-accent",
        isActive
          ? "text-foreground before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-primary dark:before:bg-page-accent before:rounded-full"
          : "text-muted-foreground"
      )}
    >
      {children}
    </button>
  )
}

function getIconColor(brandColor: string | undefined, isDark: boolean): string {
  if (!brandColor) return "currentColor"
  const luminance = getRelativeLuminance(brandColor)
  if (isDark && luminance < 0.15) return "#ffffff"
  if (!isDark && luminance > 0.85) return "currentColor"
  return brandColor
}

interface SortableNavPluginProps {
  plugin: NavPlugin
  isActive: boolean
  isDark: boolean
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
}

function SortableNavPlugin({ plugin, isActive, isDark, onClick, onContextMenu }: SortableNavPluginProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: plugin.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} role="presentation">
      <NavButton
        isActive={isActive}
        onClick={onClick}
        onContextMenu={onContextMenu}
        aria-label={plugin.name}
      >
        <span
          role="img"
          aria-label={plugin.name}
          className="size-6 inline-block"
          style={{
            backgroundColor: getIconColor(plugin.brandColor, isDark),
            WebkitMaskImage: `url(${plugin.iconUrl})`,
            WebkitMaskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskImage: `url(${plugin.iconUrl})`,
            maskSize: "contain",
            maskRepeat: "no-repeat",
            maskPosition: "center",
          }}
        />
      </NavButton>
    </div>
  )
}

export function SideNav({
  activeView,
  onViewChange,
  plugins,
  onPluginContextAction,
  isPluginRefreshAvailable,
  onReorder,
}: SideNavProps) {
  const isDark = useDarkMode()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 300, tolerance: 5 },
    })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!onReorder) return
      const { active, over } = event
      if (over && active.id !== over.id) {
        const oldIndex = plugins.findIndex((p) => p.id === active.id)
        const newIndex = plugins.findIndex((p) => p.id === over.id)
        if (oldIndex === -1 || newIndex === -1) return
        const next = arrayMove(plugins, oldIndex, newIndex)
        onReorder(next.map((p) => p.id))
      }
    },
    [onReorder, plugins]
  )

  const handlePluginContextMenu = useCallback(
    (e: React.MouseEvent, pluginId: string) => {
      e.preventDefault()
      if (!onPluginContextAction) return

      ;(async () => {
        const reloadItem = await MenuItem.new({
          id: `ctx-reload-${pluginId}`,
          text: "Refresh usage",
          enabled: isPluginRefreshAvailable ? isPluginRefreshAvailable(pluginId) : true,
          action: () => onPluginContextAction(pluginId, "reload"),
        })
        const removeItem = await MenuItem.new({
          id: `ctx-remove-${pluginId}`,
          text: "Disable plugin",
          action: () => onPluginContextAction(pluginId, "remove"),
        })
        const bottomSeparator = await PredefinedMenuItem.new({ item: "Separator" })
        const inspectItem = await MenuItem.new({
          id: `ctx-inspect-${pluginId}`,
          text: "Inspect Element",
          action: () => {
            invoke("open_devtools").catch(console.error)
          },
        })
        const menu = await Menu.new({
          items: [reloadItem, removeItem, bottomSeparator, inspectItem],
        })
        try {
          await menu.popup()
        } finally {
          await Promise.allSettled([
            menu.close(),
            reloadItem.close(),
            removeItem.close(),
            bottomSeparator.close(),
            inspectItem.close(),
          ])
        }
      })().catch(console.error)
    },
    [isPluginRefreshAvailable, onPluginContextAction]
  )

  return (
    <nav className="flex flex-col w-12 border-r bg-muted/50 dark:bg-card py-3">
      {/* Home */}
      <NavButton
        isActive={activeView === "home"}
        onClick={() => onViewChange("home")}
        aria-label="Home"
      >
        <EUsageLogoIcon className="size-6 dark:text-page-accent" />
      </NavButton>

      {/* Plugin icons */}
      <div className="flex flex-1 min-h-0 flex-col overflow-y-auto scrollbar-none">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={plugins.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            {plugins.map((plugin) => (
              <SortableNavPlugin
                key={plugin.id}
                plugin={plugin}
                isActive={activeView === plugin.id}
                isDark={isDark}
                onClick={() => onViewChange(plugin.id)}
                onContextMenu={(e) => handlePluginContextMenu(e, plugin.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Help */}
      <NavButton
        isActive={false}
        onClick={() => {
          openUrl("https://github.com/DanyilLiubchakUk/eusage/issues").catch(console.error)
          invoke("hide_panel").catch(console.error)
        }}
        aria-label="Help"
      >
        <CircleHelp className="size-6" style={import.meta.env.DEV ? { color: "#ff9705" } : undefined} />
      </NavButton>

      {/* Team */}
      <NavButton
        isActive={activeView === "team"}
        onClick={() => onViewChange("team")}
        aria-label="Team"
      >
        <Network className="size-6" />
      </NavButton>

      {/* Settings */}
      <NavButton
        isActive={activeView === "settings"}
        onClick={() => onViewChange("settings")}
        aria-label="Settings"
      >
        <Settings className="size-6" />
      </NavButton>
    </nav>
  )
}

export type { ActiveView, NavPlugin, PluginContextAction }
