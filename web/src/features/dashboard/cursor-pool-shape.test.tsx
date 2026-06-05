import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { PoolShapeFigure } from "./cursor-pool-shape"

describe("PoolShapeFigure", () => {
  it("shrinks the clipped pool-shaped water as usage rises", () => {
    const { rerender } = render(
      <PoolShapeFigure
        usedPercent={0}
        title="Cursor budget"
      />
    )

    const fullTransform = screen.getByTestId("cursor-pool-water-shape").getAttribute("transform")
    const svg = screen.getByRole("img", { name: "Cursor budget: 100 percent full" })
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute("viewBox", "-14 -4 338 224")
    expect(svg).toHaveAttribute("preserveAspectRatio", "xMidYMid meet")
    expect(svg).not.toHaveAttribute("height")
    expect(svg).not.toHaveAttribute("width")
    expect(svg.closest("figure")?.className).not.toContain("absolute")
    expect(svg.closest("figure")?.className).toContain("aspect-[338/224]")
    expect(svg.className.baseVal).toContain("h-full")
    expect(svg.className.baseVal).toContain("w-full")
    expect(svg.querySelector("circle")).toBeNull()
    expect(svg.querySelector('[stroke="#f4cf9f"]')).toBeNull()
    expect(svg.querySelector('[stroke="#b6c6ae"]')).toHaveAttribute("stroke-width", "3")
    expect(svg.querySelector('[stop-color="#caa174"]')).toBeNull()
    expect(svg.querySelector('[stop-color="#3f5947"]')).toBeInTheDocument()
    expect(screen.getByTestId("cursor-pool-water-floaters")).toBeInTheDocument()

    rerender(
      <PoolShapeFigure
        usedPercent={100}
        title="Cursor budget"
      />
    )

    const emptyTransform = screen.getByTestId("cursor-pool-water-shape").getAttribute("transform")
    expect(screen.getByRole("img", { name: "Cursor budget: 0 percent full" })).toBeInTheDocument()
    expect(fullTransform).toContain("scale(1.080)")
    expect(emptyTransform).toContain("scale(0.010)")
  })
})
