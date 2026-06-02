import { copyFile, readFile, rm, rename, writeFile } from "node:fs/promises"
import { spawn } from "node:child_process"

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" })
    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${command} ${args.join(" ")} failed with code ${code}`))
    })
  })
}

await rm(".vercel", { force: true, recursive: true })
await rm("web/.vercel", { force: true, recursive: true })
await run("bun", ["run", "build:web"])
await rename("web/.vercel", ".vercel")

const configPath = ".vercel/output/config.json"
const config = JSON.parse(await readFile(configPath, "utf8"))
config.routes = [
  {
    src: "/assets/(.*)",
    dest: "/assets/$1",
    headers: {
      "cache-control": "public, max-age=31536000, immutable",
    },
  },
  {
    src: "/favicon.svg",
    dest: "/favicon.svg",
  },
  {
    src: "/icon.png",
    dest: "/icon.png",
  },
  {
    src: "/(.*)",
    dest: "/__server",
  },
]
await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`)

await copyFile("public/favicon.svg", ".vercel/output/static/favicon.svg")
await copyFile("public/icon.png", ".vercel/output/static/icon.png")
