import { useEffect, useRef } from "react"
import type { ChartConfiguration, ChartType } from "chart.js"

type DashboardChartDataset = {
  label: string
  data: number[]
  borderColor?: string
  backgroundColor?: string
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
    return <p className="admin-chart-empty">{emptyLabel}</p>
  }

  return (
    <div className="admin-chart-frame">
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
  return {
    type,
    data: {
      labels,
      datasets: datasets.map((dataset) => ({
        label: dataset.label,
        data: dataset.data,
        borderColor: dataset.borderColor ?? "#0f766e",
        backgroundColor: dataset.backgroundColor ?? "rgba(15, 118, 110, 0.18)",
        borderWidth: type === "line" ? 2 : 0,
        borderRadius: type === "bar" ? 4 : 0,
        fill: type === "line",
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
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: "#64748b",
            maxRotation: 0,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(148, 163, 184, 0.28)",
          },
          ticks: {
            color: "#64748b",
          },
        },
      },
    },
  }
}
