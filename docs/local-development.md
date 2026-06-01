# Local Development Setup

Simple setup for running eUsage locally on macOS and Windows.

## Important

- Use macOS Terminal for macOS.
- Use Windows PowerShell for Windows.
- Do not use WSL for Windows tray testing. The app must run as a real Windows desktop app.
- Windows v1 target is x64.
- Test one thing at a time.

## macOS

Install Apple build tools:

```bash
xcode-select --install
```

Install Rust:

```bash
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
```

Install Bun:

```bash
curl -fsSL https://bun.com/install | bash
```

Restart terminal, then verify:

```bash
rustc --version
cargo --version
bun --version
```

Get repo:

```bash
git clone https://github.com/DanyilLiubchakUk/eusage.git
cd eusage
```

If repo already exists:

```bash
cd eusage
git pull --rebase
```

Install project deps:

```bash
bun install
```

Run local web/backend:

```bash
bun dev:web
```

This starts TanStack Start and Convex dev.

Run desktop app in a second terminal:

```bash
bun dev:desktop
```

This starts Tauri.

Use the same connection string shape locally:

```bash
eusage://connect?url=http://localhost:3000&token=eusage_dev_...
```

Run checks when needed:

```bash
bun test:web
bun run test
bun run collector:test
```

Direct fallback:

```bash
bun tauri dev
```

## Windows

Use Windows PowerShell.

Install Microsoft C++ Build Tools:

1. Install Visual Studio Build Tools.
2. Select `Desktop development with C++`.
3. Restart PowerShell after install.

Install Rust:

```powershell
winget install --id Rustlang.Rustup
rustup default stable-msvc
```

Install Bun:

```powershell
powershell -c "irm bun.sh/install.ps1|iex"
```

Restart PowerShell, then verify:

```powershell
rustc --version
cargo --version
bun --version
```

Get repo:

```powershell
git clone https://github.com/DanyilLiubchakUk/eusage.git
cd eusage
```

If repo already exists:

```powershell
cd eusage
git pull --rebase
```

Install project deps:

```powershell
bun install
```

Run local web/backend:

```powershell
bun dev:web
```

This starts TanStack Start and Convex dev.

Run desktop app in a second PowerShell:

```powershell
bun dev:desktop
```

This starts Tauri.

Expected shell behavior:

1. eUsage starts with no normal centered window.
2. eUsage appears in the taskbar corner or hidden-icons overflow.
3. First run shows a short note explaining tray overflow and manual pinning.
4. Left-click the tray icon to open and close the popup.
5. Right-click the tray icon to open the menu and quit.

Use the same connection string shape locally:

```powershell
eusage://connect?url=http://localhost:3000&token=eusage_dev_...
```

Run checks when needed:

```powershell
bun test:web
bun run test
bun run collector:test
```

Direct fallback:

```powershell
bun tauri dev
```

## Windows Test Order

Do this one by one:

1. `bun install`.
2. `bun dev:web` in one PowerShell.
3. `bun dev:desktop` in a second PowerShell.
4. App starts outside WSL.
5. Tray icon appears in taskbar corner or overflow.
6. First run explains overflow and manual pinning.
7. Left-click tray icon opens popup near the tray area.
8. Left-click tray icon again closes popup.
9. `Esc` closes popup.
10. Right-click tray icon opens menu.
11. Quit works from tray menu.
12. Logs exist.

Provider work comes later:

13. Codex provider works.
14. Cursor provider works.
15. Claude provider works.
16. JetBrains AI Assistant provider works.
17. Team page connects.
18. Team sync sends data.

If one step fails, stop and fix that step first.

## Provider Platform Checklist

Run this manually for each required provider on macOS and Windows:

- Provider app or CLI is installed.
- Provider user is signed in.
- eUsage provider card shows data.
- Team upload succeeds.
- Admin shows provider/developer row.
- TV includes the provider metric.

Required providers:

- Cursor.
- Codex.
- Claude.
- JetBrains AI Assistant.

## Notes

- Windows may show unsigned app warnings for v1 builds.
- Windows may put eUsage in tray overflow. Pin it manually if wanted.
- Provider "supported" means readable when that provider app or CLI is installed and signed in.
- Local docs and code changes must be committed and pushed before another machine can pull them.

## References

- Tauri prerequisites: https://v2.tauri.app/start/prerequisites/
- Bun install: https://bun.com/docs/installation
