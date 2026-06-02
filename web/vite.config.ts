import { defineConfig, type PluginOption } from "vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import react from "@vitejs/plugin-react"
import { nitro } from "nitro/vite"

export default defineConfig(({ command }) => {
  const plugins: PluginOption[] = [
    tanstackStart({
      srcDirectory: "src",
    }),
    react(),
  ]

  if (command === "build") {
    plugins.splice(1, 0, nitro({ preset: "vercel" }))
  }

  return {
    root: "web",
    plugins,
    server: {
      port: 3000,
      strictPort: true,
    },
    build: {
      outDir: "web/dist",
    },
  }
})
