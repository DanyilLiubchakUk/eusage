import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { LandingPreview } from "./LandingPreview.tsx"
import "./preview.css"

const root = document.getElementById("root")
if (!root) throw new Error("Missing #root")

createRoot(root).render(
  <StrictMode>
    <LandingPreview />
  </StrictMode>
)
