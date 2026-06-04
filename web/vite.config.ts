import path from "path"
import { defineConfig, type PluginOption } from "vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"

export default defineConfig(({ command }) => {
  const plugins: PluginOption[] = [
    tailwindcss(),
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
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "../src"),
        "@web": path.resolve(__dirname, "src"),
      },
    },
    server: {
      port: 3000,
      strictPort: true,
    },
    build: {
      outDir: "web/dist",
    },
  }
})
