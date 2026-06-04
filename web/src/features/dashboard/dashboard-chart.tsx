import { useEffect, useRef } from "react"
import type { ChartConfiguration, ChartType } from "chart.js"

type DashboardChartDataset = {
  label: string
  data: number[]
  borderColor?: string
  backgroundColor?: string
  yAxisID?: "y" | "y1"
}

type DashboardChartProps = {
  type: Extract<ChartType, "line" | "bar">
  ariaLabel: string
  labels: string[]
  datasets: DashboardChartDataset[]
  emptyLabel: string
}

export function DashboardChart({
  type,
  ariaLabel,
  labels,
  datasets,
  emptyLabel,
}: DashboardChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const hasData = labels.length > 0 && datasets.some((dataset) => dataset.data.length > 0)

  useEffect(() => {
    if (!hasData || !canvasRef.current) return

    let cancelled = false
    let chart: { destroy: () => void } | null = null

    async function renderChart() {
      try {
        const context = canvasContext(canvasRef.current)
        if (!context || cancelled) return

        const { default: Chart } = await import("chart.js/auto")
        if (cancelled) return

        chart = new Chart(context, chartConfig(type, labels, datasets))
      } catch (error) {
        console.error("Dashboard chart failed to render.", error)
      }
    }

    void renderChart()

    return () => {
      cancelled = true
      chart?.destroy()
    }
  }, [type, labels, datasets, hasData])

  if (!hasData) {
    return (
      <div className="admin-chart-frame-empty grid h-full min-h-72 place-items-center rounded-lg border border-dashed bg-muted/40 p-6">
        <p className="m-0 text-center text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div className="h-full min-h-72 rounded-lg bg-background/60 p-3">
      <canvas ref={canvasRef} aria-label={ariaLabel} role="img" />
    </div>
  )
}

function canvasContext(canvas: HTMLCanvasElement | null) {
  if (!canvas) return null
  const userAgent = canvas.ownerDocument.defaultView?.navigator.userAgent ?? ""
  if (userAgent.includes("jsdom")) return null
  return canvas.getContext("2d")
}

function chartConfig(
  type: DashboardChartProps["type"],
  labels: string[],
  datasets: DashboardChartDataset[]
): ChartConfiguration {
  const hasRightAxis = datasets.some((dataset) => dataset.yAxisID === "y1")

  return {
    type,
    data: {
      labels,
      datasets: datasets.map((dataset) => ({
        label: dataset.label,
        data: dataset.data,
        yAxisID: dataset.yAxisID ?? "y",
        borderColor: dataset.borderColor ?? "#0f766e",
        backgroundColor: dataset.backgroundColor ?? "rgba(15, 118, 110, 0.18)",
        borderWidth: type === "line" ? 2 : 0,
        borderRadius: type === "bar" ? 4 : 0,
        fill: type === "line" && dataset.yAxisID !== "y1",
        tension: type === "line" ? 0.25 : 0,
        pointRadius: type === "line" ? 3 : 0,
      })),
    },
    options: {
      animation: false,
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: {
          display: datasets.length > 1,
          labels: {
            boxWidth: 10,
            color: "#334155",
          },
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context) => {
              const label = context.dataset.label ? `${context.dataset.label}: ` : ""
              const value = Number(context.parsed.y)
              const formatted =
                context.dataset.yAxisID === "y1" ? formatUsdAxisValue(value) : compactAxisValue(value)
              return `${label}${formatted}`
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            autoSkip: false,
            color: "#64748b",
            maxRotation: 45,
            minRotation: labels.length > 14 ? 45 : 0,
          },
        },
        y: {
          beginAtZero: true,
          position: "left",
          grid: {
            color: "rgba(148, 163, 184, 0.28)",
          },
          title: {
            display: hasRightAxis,
            text: "Tokens",
            color: "#334155",
          },
          ticks: {
            color: "#64748b",
            callback: (value) => compactAxisValue(Number(value)),
          },
        },
        ...(hasRightAxis
          ? {
              y1: {
                beginAtZero: true,
                position: "right" as const,
                grid: {
                  drawOnChartArea: false,
                },
                title: {
                  display: true,
                  text: "API equivalent",
                  color: "#334155",
                },
                ticks: {
                  color: "#64748b",
                  callback: (value: string | number) => formatUsdAxisValue(Number(value)),
                },
              },
            }
          : {}),
      },
    },
  }
}

function compactAxisValue(value: number) {
  if (!Number.isFinite(value)) return ""
  const absolute = Math.abs(value)
  if (absolute >= 1_000_000_000) return `${formatAxisNumber(value / 1_000_000_000)}B`
  if (absolute >= 1_000_000) return `${formatAxisNumber(value / 1_000_000)}M`
  if (absolute >= 1_000) return `${formatAxisNumber(value / 1_000)}K`
  return String(value)
}

function formatAxisNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value < 10 ? 1 : 0,
  }).format(value)
}

function formatUsdAxisValue(value: number) {
  if (!Number.isFinite(value)) return ""
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
