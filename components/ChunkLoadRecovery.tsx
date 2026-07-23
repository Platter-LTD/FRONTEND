"use client"

import { useEffect } from "react"
import { isChunkLoadError, reloadForStaleChunks } from "@/lib/chunkLoadRecovery"

/**
 * Listens for webpack/Next chunk load failures and performs a one-shot hard reload
 * so login → dashboard works after a fresh Vercel deploy.
 */
export function ChunkLoadRecovery() {
  useEffect(() => {
    // Clear one-shot query flag after a successful load
    try {
      const url = new URL(window.location.href)
      if (url.searchParams.has("_chunk_reload")) {
        url.searchParams.delete("_chunk_reload")
        window.history.replaceState({}, "", url.pathname + url.search + url.hash)
      }
    } catch {
      /* ignore */
    }

    const onError = (event: ErrorEvent) => {
      const target = event.target as HTMLElement | null
      const isScriptOrLink =
        target &&
        (target.tagName === "SCRIPT" ||
          (target.tagName === "LINK" && (target as HTMLLinkElement).rel === "stylesheet"))

      if (isScriptOrLink || isChunkLoadError(event.error) || isChunkLoadError(event.message)) {
        reloadForStaleChunks("window-error")
      }
    }

    const onRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadError(event.reason)) {
        event.preventDefault()
        reloadForStaleChunks("unhandledrejection")
      }
    }

    window.addEventListener("error", onError, true)
    window.addEventListener("unhandledrejection", onRejection)
    return () => {
      window.removeEventListener("error", onError, true)
      window.removeEventListener("unhandledrejection", onRejection)
    }
  }, [])

  return null
}
