import { useState, useEffect } from "react"
import bundledChangelog from "../../CHANGELOG.md?raw"

export interface Release {
  id: number
  tag_name: string
  name: string | null
  body: string | null
  published_at: string | null
  html_url: string
}

async function fetchReleaseByTag(tag: string): Promise<Release | null> {
  const url = `https://api.github.com/repos/DanyilLiubchakUk/eusage/releases/tags/${encodeURIComponent(
    tag,
  )}`
  const res = await fetch(url)

  if (res.status === 404) {
    return null
  }

  if (!res.ok) {
    throw new Error("Failed to fetch releases")
  }

  const data = (await res.json()) as Release
  return data
}

function normalizeVersionTag(version: string): string {
  const trimmed = version.trim()
  return trimmed.startsWith("v") ? trimmed : `v${trimmed}`
}

function isReleaseVersion(version: string): boolean {
  return /^v?\d+\.\d+\.\d+$/.test(version.trim())
}

function parseBundledChangelog(source: string): Release[] {
  const matches = [...source.matchAll(/^##\s+(v?\d+\.\d+\.\d+)\s*$/gm)]

  return matches.map((match, index) => {
    const version = normalizeVersionTag(match[1])
    const bodyStart = match.index + match[0].length
    const nextMatch = matches[index + 1]
    const bodyEnd = nextMatch?.index ?? source.length
    const body = source.slice(bodyStart, bodyEnd).trim()

    return {
      id: index + 1,
      tag_name: version,
      name: version,
      body,
      published_at: null,
      html_url: `https://github.com/DanyilLiubchakUk/eusage/releases/tag/${version}`,
    }
  })
}

function mergeCurrentReleaseMetadata(
  releases: Release[],
  currentVersion: string,
  githubRelease: Release | null,
): Release[] {
  if (!githubRelease) return releases

  const currentTag = normalizeVersionTag(currentVersion)
  const githubTag = normalizeVersionTag(githubRelease.tag_name)

  if (githubTag !== currentTag) return releases

  const existingIndex = releases.findIndex(
    (release) => normalizeVersionTag(release.tag_name) === currentTag,
  )
  const githubHasBody = Boolean(githubRelease.body?.trim())

  if (existingIndex === -1) {
    return [githubRelease, ...releases]
  }

  const next = [...releases]
  next[existingIndex] = {
    ...next[existingIndex],
    id: githubRelease.id,
    name: githubRelease.name ?? next[existingIndex].name,
    body: githubHasBody ? githubRelease.body : next[existingIndex].body,
    published_at: githubRelease.published_at ?? next[existingIndex].published_at,
    html_url: githubRelease.html_url || next[existingIndex].html_url,
  }
  return next
}

export function useChangelog(currentVersion: string) {
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const fetchForCurrentVersion = async () => {
      setLoading(true)
      setReleases([])
      setError(null)
      try {
        const bundledReleases = parseBundledChangelog(bundledChangelog)
        let release: Release | null = null

        if (!isReleaseVersion(currentVersion)) {
          release = null
        } else if (currentVersion.startsWith("v")) {
          release =
            (await fetchReleaseByTag(currentVersion)) ??
            (await fetchReleaseByTag(currentVersion.slice(1)))
        } else {
          release =
            (await fetchReleaseByTag(`v${currentVersion}`) ??
            (await fetchReleaseByTag(currentVersion)))
        }

        if (mounted) {
          setReleases(mergeCurrentReleaseMetadata(bundledReleases, currentVersion, release))
          setError(null)
        }
      } catch (err) {
        if (mounted) {
          const bundledReleases = parseBundledChangelog(bundledChangelog)
          if (bundledReleases.length > 0) {
            setReleases(bundledReleases)
            setError(null)
          } else {
            const message =
              err instanceof Error ? err.message : "Failed to fetch releases"
            setError(message)
          }
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchForCurrentVersion()

    return () => {
      mounted = false
    }
  }, [currentVersion])

  return { releases, loading, error }
}
