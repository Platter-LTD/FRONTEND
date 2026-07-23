"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { isChunkLoadError, reloadForStaleChunks } from "@/lib/chunkLoadRecovery"

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const chunkError = isChunkLoadError(error)

  useEffect(() => {
    if (chunkError) {
      reloadForStaleChunks("app-error")
    }
  }, [chunkError])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="text-xl font-semibold text-gray-900">
        {chunkError ? "Updating the app…" : "Something went wrong"}
      </h2>
      <p className="max-w-md text-sm text-gray-600">
        {chunkError
          ? "A newer version was deployed. Reloading to load the latest files."
          : error.message || "An unexpected error occurred."}
      </p>
      {!chunkError ? (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button variant="outline" onClick={() => reset()}>
            Try again
          </Button>
          <Button
            className="bg-[#9A813F] text-white hover:bg-[#8a7435]"
            onClick={() => window.location.reload()}
          >
            Reload page
          </Button>
        </div>
      ) : null}
    </div>
  )
}
