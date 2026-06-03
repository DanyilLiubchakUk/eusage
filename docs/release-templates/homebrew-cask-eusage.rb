cask "eusage" do
  version "0.6.24"
  sha256 "REPLACE_WITH_DMG_SHA256"

  url "https://github.com/DanyilLiubchakUk/eusage/releases/download/v#{version}/REPLACE_WITH_DMG_ASSET_NAME.dmg"
  name "eUsage"
  desc "Internal team AI usage tracker"
  homepage "https://github.com/DanyilLiubchakUk/eusage"

  app "eUsage.app"

  # Private-tap only fallback for unsigned or unnotarized internal builds.
  # Prefer install docs with: brew install --cask eusage --no-quarantine
  postflight do
    system_command "/usr/bin/xattr",
                   args: ["-cr", "#{appdir}/eUsage.app"],
                   sudo: false
  end

  zap trash: [
    "~/Library/Application Support/app.eusage.desktop",
    "~/Library/Logs/app.eusage.desktop",
    "~/Library/Preferences/app.eusage.desktop.plist",
    "~/Library/Saved Application State/app.eusage.desktop.savedState",
  ]
end
