/**
 * Recover from Next.js ChunkLoadError after a new deploy (version skew).
 * Old tabs keep requesting hashed chunks that no longer exist on the CDN.
 */

const RELOAD_KEY = "plata_chunk_load_reload_at"
const RELOAD_COOLDOWN_MS = 15_000

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false

  if (typeof error === "string") {
    return /loading chunk|chunkloaderror|failed to fetch dynamically imported module|loading css chunk/i.test(
      error,
    )
  }

  if (typeof error === "object") {
    const err = error as { name?: string; message?: string; cause?: unknown }
    if (err.name === "ChunkLoadError") return true
    const message = String(err.message || "")
    if (/loading chunk|chunkloaderror|failed to fetch dynamically imported module|loading css chunk/i.test(message)) {
      return true
    }
    if (err.cause) return isChunkLoadError(err.cause)
  }

  return false
}

/** Hard reload once within the cooldown window to pick up the latest deployment assets. */
export function reloadForStaleChunks(reason = "chunk-load"): boolean {
  if (typeof window === "undefined") return false

  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || "0")
    const now = Date.now()
    if (last && now - last < RELOAD_COOLDOWN_MS) {
      return false
    }
    sessionStorage.setItem(RELOAD_KEY, String(now))
  } catch {
    // sessionStorage may be blocked; still attempt a reload
  }

  const url = new URL(window.location.href)
  url.searchParams.set("_chunk_reload", reason)
  // Drop bfcache / stale document; force a full navigation to current deployment
  window.location.replace(url.toString())
  return true
}
