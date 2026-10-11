import path from "path"
import { fileURLToPath } from "url"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const previewDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(previewDir, "../..")

export default defineConfig({
  root: previewDir,
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": path.resolve(repoRoot, "src"),
      "@web": path.resolve(repoRoot, "web/src"),
    },
  },
  server: {
    port: 4173,
    strictPort: true,
    fs: { allow: [repoRoot] },
  },
})
