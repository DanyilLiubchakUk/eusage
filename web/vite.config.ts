import { defineConfig } from "vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  root: ".",
  plugins: [
    tanstackStart({
      srcDirectory: "web/src",
    }),
    react(),
  ],
  server: {
    port: 3000,
    strictPort: true,
  },
  build: {
    outDir: "web/dist",
  },
})
