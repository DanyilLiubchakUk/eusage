cask "eusage" do
  arch arm: "aarch64", intel: "x64"

  version "REPLACE_WITH_VERSION"
  sha256 arm:   "REPLACE_WITH_AARCH64_DMG_SHA256",
         intel: "REPLACE_WITH_X64_DMG_SHA256"

  url "https://github.com/DanyilLiubchakUk/eusage/releases/download/v#{version}/eUsage_#{version}_#{arch}.dmg"
  name "eUsage"
  desc "Internal team AI usage tracker"
  homepage "https://github.com/DanyilLiubchakUk/eusage"

  depends_on macos: :ventura

  app "eUsage.app"

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
